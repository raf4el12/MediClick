import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PrismaScheduleRepository } from './prisma-schedule.repository.js';
import { PrismaHolidayRepository } from '../../../holidays/infrastructure/persistence/prisma-holiday.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const time = (hh: string) => new Date(`1970-01-01T${hh}:00.000Z`);

describeDatabase('Consultas por rango para días con cupos (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const schedules = new PrismaScheduleRepository(prisma);
  const holidays = new PrismaHolidayRepository(prisma);

  const suffix = `available-days-${process.pid}-${Date.now()}`;
  const clinicIds: number[] = [];
  const scheduleIds: number[] = [];
  const appointmentIds: number[] = [];
  let doctorId: number;
  let patientId: number;
  let mainSpecialtyId: number;
  let otherSpecialtyId: number;
  let clinicA: number;
  let clinicB: number;

  const createSchedule = async (specialtyId: number, date: string) => {
    const schedule = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId,
        clinicId: clinicA,
        scheduleDate: day(date),
        timeFrom: time('08:00'),
        timeTo: time('12:00'),
      },
    });
    scheduleIds.push(schedule.id);
    return schedule.id;
  };

  const createAppointment = async (
    scheduleId: number,
    start: string,
    end: string,
    status: AppointmentStatus,
  ) => {
    const appointment = await prisma.appointments.create({
      data: {
        patientId,
        scheduleId,
        clinicId: clinicA,
        status,
        startTime: time(start),
        endTime: time(end),
      },
    });
    appointmentIds.push(appointment.id);
  };

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['a', 'b']) {
      const clinic = await prisma.clinics.create({
        data: { name: `Clinic ${label} ${suffix}`, timezone: 'America/Lima' },
      });
      clinicIds.push(clinic.id);
    }
    [clinicA, clinicB] = clinicIds;

    const doctorUser = await prisma.users.create({
      data: {
        name: 'Doctor',
        email: `doctor@${suffix}.test`,
        password: 'password',
        clinicId: clinicA,
      },
    });
    const doctorProfile = await prisma.profiles.create({
      data: { name: 'Doctor', lastName: 'Rango', userId: doctorUser.id },
    });
    const doctor = await prisma.doctors.create({
      data: {
        profileId: doctorProfile.id,
        licenseNumber: `LIC-${suffix}`,
        clinicId: clinicA,
      },
    });
    doctorId = doctor.id;

    const patientUser = await prisma.users.create({
      data: {
        name: 'Paciente',
        email: `patient@${suffix}.test`,
        password: 'password',
      },
    });
    const patientProfile = await prisma.profiles.create({
      data: { name: 'Paciente', lastName: 'Rango', userId: patientUser.id },
    });
    const patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: '999888777',
        bloodType: 'O+',
      },
    });
    patientId = patient.id;

    const category = await prisma.categories.create({
      data: { name: `Cat ${suffix}` },
    });
    const [main, other] = await Promise.all(
      ['main', 'other'].map((label) =>
        prisma.specialties.create({
          data: {
            name: `Spec ${label} ${suffix}`,
            categoryId: category.id,
            duration: 30,
            price: 100,
          },
        }),
      ),
    );
    mainSpecialtyId = main.id;
    otherSpecialtyId = other.id;

    const mainOn10 = await createSchedule(mainSpecialtyId, '2099-03-10');
    const mainOn12 = await createSchedule(mainSpecialtyId, '2099-03-12');
    const otherOn10 = await createSchedule(otherSpecialtyId, '2099-03-10');
    await createSchedule(mainSpecialtyId, '2099-03-13');

    await createAppointment(
      mainOn10,
      '08:00',
      '08:30',
      AppointmentStatus.CONFIRMED,
    );
    await createAppointment(
      otherOn10,
      '09:00',
      '09:30',
      AppointmentStatus.PENDING,
    );
    await createAppointment(
      mainOn12,
      '10:00',
      '10:30',
      AppointmentStatus.CANCELLED,
    );

    await prisma.holidays.createMany({
      data: [
        {
          name: `Global ${suffix}`,
          date: day('2099-03-11'),
          year: 2099,
          clinicId: null,
        },
        {
          name: `Sede A ${suffix}`,
          date: day('2099-03-12'),
          year: 2099,
          clinicId: clinicA,
        },
        {
          name: `Sede B ${suffix}`,
          date: day('2099-03-10'),
          year: 2099,
          clinicId: clinicB,
        },
        {
          name: `Inactivo ${suffix}`,
          date: day('2099-03-10'),
          year: 2099,
          clinicId: null,
          isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    try {
      await prisma.holidays.deleteMany({
        where: { name: { contains: suffix } },
      });
      await prisma.appointments.deleteMany({
        where: { id: { in: appointmentIds } },
      });
      await prisma.schedules.deleteMany({ where: { id: { in: scheduleIds } } });
      await prisma.patients.deleteMany({ where: { id: patientId } });
      await prisma.doctors.deleteMany({ where: { id: doctorId } });
      await prisma.profiles.deleteMany({
        where: { user: { email: { contains: suffix } } },
      });
      await prisma.users.deleteMany({ where: { email: { contains: suffix } } });
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

  it('findByDoctorRange devuelve los bloques de la especialidad con límites inclusivos', async () => {
    const result = await schedules.findByDoctorRange(
      doctorId,
      day('2099-03-10'),
      day('2099-03-12'),
      mainSpecialtyId,
    );

    expect(
      result.map((s) => s.scheduleDate.toISOString().slice(0, 10)),
    ).toEqual(['2099-03-10', '2099-03-12']);
  });

  it('findDoctorBookingsInRange incluye citas activas de cualquier especialidad y excluye las canceladas', async () => {
    const result = await schedules.findDoctorBookingsInRange(
      doctorId,
      day('2099-03-10'),
      day('2099-03-12'),
    );

    expect(
      result
        .map(
          (b) =>
            `${b.scheduleDate.toISOString().slice(0, 10)} ${b.startTime.toISOString().slice(11, 16)}`,
        )
        .sort(),
    ).toEqual(['2099-03-10 08:00', '2099-03-10 09:00']);
  });

  it('findActiveInRangeForClinic devuelve feriados globales y de la sede, no los de otra sede ni inactivos', async () => {
    const result = await holidays.findActiveInRangeForClinic(
      day('2099-03-10'),
      day('2099-03-12'),
      clinicA,
    );

    expect(result.map((h) => h.date.toISOString().slice(0, 10))).toEqual([
      '2099-03-11',
      '2099-03-12',
    ]);
  });
});
