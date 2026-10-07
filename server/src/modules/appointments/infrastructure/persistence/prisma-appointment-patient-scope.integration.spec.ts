import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PrismaAppointmentRepository } from './prisma-appointment.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaAppointmentRepository listado acotado a un paciente (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaAppointmentRepository(prisma);

    const suffix = `patient-scope-${process.pid}-${Date.now()}`;
    const clinicIds: number[] = [];
    const doctorIds: number[] = [];
    const scheduleIds: number[] = [];
    const patientIds: number[] = [];
    const appointmentIds: number[] = [];
    let ownPatientId: number;
    let otherPatientId: number;

    const createDoctorSchedule = async (label: string, specialtyId: number) => {
      const clinic = await prisma.clinics.create({
        data: { name: `Clinic ${label} ${suffix}`, timezone: 'America/Lima' },
      });
      clinicIds.push(clinic.id);
      const user = await prisma.users.create({
        data: {
          name: `Doctor ${label}`,
          email: `doctor-${label}@${suffix}.test`,
          password: 'password',
          clinicId: clinic.id,
        },
      });
      const profile = await prisma.profiles.create({
        data: { name: 'Doctor', lastName: label, userId: user.id },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: profile.id,
          licenseNumber: `LIC-${label}-${suffix}`,
          clinicId: clinic.id,
        },
      });
      doctorIds.push(doctor.id);
      const schedule = await prisma.schedules.create({
        data: {
          doctorId: doctor.id,
          specialtyId,
          clinicId: clinic.id,
          scheduleDate: new Date('2099-01-01T00:00:00.000Z'),
          timeFrom: new Date('1970-01-01T08:00:00.000Z'),
          timeTo: new Date('1970-01-01T17:00:00.000Z'),
        },
      });
      scheduleIds.push(schedule.id);
      return { clinicId: clinic.id, scheduleId: schedule.id };
    };

    const createPatient = async (label: string) => {
      const user = await prisma.users.create({
        data: {
          name: `Patient ${label}`,
          email: `patient-${label}@${suffix}.test`,
          password: 'password',
        },
      });
      const profile = await prisma.profiles.create({
        data: { name: 'Patient', lastName: label, userId: user.id },
      });
      const patient = await prisma.patients.create({
        data: {
          profileId: profile.id,
          emergencyContact: '999888777',
          bloodType: 'O+',
        },
      });
      patientIds.push(patient.id);
      return patient.id;
    };

    const createAppointment = async (
      patientId: number,
      slot: { clinicId: number; scheduleId: number },
      hour: number,
    ) => {
      const hh = String(hour).padStart(2, '0');
      const appointment = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId: slot.scheduleId,
          clinicId: slot.clinicId,
          status: AppointmentStatus.CONFIRMED,
          startTime: new Date(`1970-01-01T${hh}:00:00.000Z`),
          endTime: new Date(`1970-01-01T${hh}:30:00.000Z`),
        },
      });
      appointmentIds.push(appointment.id);
    };

    beforeAll(async () => {
      await prisma.$connect();
      const category = await prisma.categories.create({
        data: { name: `Cat ${suffix}` },
      });
      const specialty = await prisma.specialties.create({
        data: {
          name: `Spec ${suffix}`,
          categoryId: category.id,
          duration: 30,
          price: 100,
        },
      });

      const clinicA = await createDoctorSchedule('a', specialty.id);
      const clinicB = await createDoctorSchedule('b', specialty.id);
      ownPatientId = await createPatient('own');
      otherPatientId = await createPatient('other');

      await createAppointment(ownPatientId, clinicA, 9);
      await createAppointment(ownPatientId, clinicB, 10);
      await createAppointment(otherPatientId, clinicA, 11);
    });

    afterAll(async () => {
      try {
        await prisma.appointments.deleteMany({
          where: { id: { in: appointmentIds } },
        });
        await prisma.schedules.deleteMany({
          where: { id: { in: scheduleIds } },
        });
        await prisma.patients.deleteMany({ where: { id: { in: patientIds } } });
        await prisma.doctors.deleteMany({ where: { id: { in: doctorIds } } });
        await prisma.profiles.deleteMany({
          where: { user: { email: { contains: suffix } } },
        });
        await prisma.users.deleteMany({
          where: { email: { contains: suffix } },
        });
        await prisma.specialties.deleteMany({
          where: { name: { contains: suffix } },
        });
        await prisma.categories.deleteMany({
          where: { name: { contains: suffix } },
        });
        await prisma.clinics.deleteMany({ where: { id: { in: clinicIds } } });
      } finally {
        await prisma.$disconnect();
      }
    });

    it('con patientId devuelve las citas de ese paciente en todas sus sedes y ninguna ajena', async () => {
      const result = await repository.findAllPaginated(
        { offset: 0, limit: 50 },
        { patientId: ownPatientId },
      );

      expect(result.totalRows).toBe(2);
      expect(result.rows.map((row) => row.patientId)).toEqual([
        ownPatientId,
        ownPatientId,
      ]);
      expect(result.rows.map((row) => row.patientId)).not.toContain(
        otherPatientId,
      );
    });
  },
);
