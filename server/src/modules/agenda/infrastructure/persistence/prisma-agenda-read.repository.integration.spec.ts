import { PrismaService } from '../../../../prisma/prisma.service.js';
import { resolveAgendaScope } from '../../domain/services/agenda-scope.policy.js';
import { PrismaAgendaReadRepository } from './prisma-agenda-read.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const time = (hh: string) => new Date(`1970-01-01T${hh}:00.000Z`);

describeDatabase(
  'Lectura de la agenda con alcance de sede (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaAgendaReadRepository(prisma);

    const suffix = `agenda-${process.pid}-${Date.now()}`;
    const clinicIds: number[] = [];
    const doctorIds: number[] = [];
    const scheduleIds: number[] = [];
    let clinic1: number;
    let clinic2: number;
    let doctorA: number;
    let doctorB: number;
    let patientId: number;
    let appointmentId: number;

    const createDoctor = async (label: string, clinicId: number) => {
      const user = await prisma.users.create({
        data: {
          name: label,
          email: `${label}@${suffix}.test`,
          password: 'password',
          clinicId,
        },
      });
      const profile = await prisma.profiles.create({
        data: { name: 'Médico', lastName: label, userId: user.id },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: profile.id,
          licenseNumber: `LIC-${label}-${suffix}`,
          clinicId,
        },
      });
      doctorIds.push(doctor.id);
      return doctor.id;
    };

    beforeAll(async () => {
      await prisma.$connect();
      for (const label of ['1', '2']) {
        const clinic = await prisma.clinics.create({
          data: {
            name: `Sede ${label} ${suffix}`,
            timezone: label === '1' ? 'America/Lima' : 'America/Bogota',
          },
        });
        clinicIds.push(clinic.id);
      }
      [clinic1, clinic2] = clinicIds;
      doctorA = await createDoctor('a', clinic1);
      doctorB = await createDoctor('b', clinic2);

      const category = await prisma.categories.create({
        data: { name: `Cat ${suffix}` },
      });
      const specialty = await prisma.specialties.create({
        data: {
          name: `Spec ${suffix}`,
          categoryId: category.id,
          duration: 30,
          bufferMinutes: 5,
          price: 100,
        },
      });

      for (const doctorId of [doctorA, doctorB]) {
        const schedule = await prisma.schedules.create({
          data: {
            doctorId,
            specialtyId: specialty.id,
            clinicId: doctorId === doctorA ? clinic1 : clinic2,
            scheduleDate: day('2099-05-10'),
            timeFrom: time('08:00'),
            timeTo: time('10:00'),
          },
        });
        scheduleIds.push(schedule.id);
      }

      const patientUser = await prisma.users.create({
        data: {
          name: 'Paciente',
          email: `patient@${suffix}.test`,
          password: 'password',
        },
      });
      const patientProfile = await prisma.profiles.create({
        data: {
          name: 'Ana',
          lastName: 'Agenda',
          phone: '999111222',
          userId: patientUser.id,
        },
      });
      const patient = await prisma.patients.create({
        data: {
          profileId: patientProfile.id,
          emergencyContact: '999888777',
          bloodType: 'O+',
        },
      });
      patientId = patient.id;
      const appointment = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId: scheduleIds[0],
          clinicId: clinic1,
          status: 'NO_SHOW',
          startTime: time('08:00'),
          endTime: time('08:30'),
        },
      });
      appointmentId = appointment.id;

      await prisma.holidays.createMany({
        data: [
          {
            name: `Global ${suffix}`,
            date: day('2099-05-11'),
            year: 2099,
            clinicId: null,
          },
          {
            name: `Sede 1 ${suffix}`,
            date: day('2099-05-12'),
            year: 2099,
            clinicId: clinic1,
          },
          {
            name: `Sede 2 ${suffix}`,
            date: day('2099-05-13'),
            year: 2099,
            clinicId: clinic2,
          },
        ],
      });
      await prisma.scheduleBlocks.create({
        data: {
          doctorId: doctorB,
          type: 'FULL_DAY',
          startDate: day('2099-05-10'),
          endDate: day('2099-05-10'),
          reason: `Bloqueo B ${suffix}`,
        },
      });
    });

    afterAll(async () => {
      try {
        await prisma.scheduleBlocks.deleteMany({
          where: { doctorId: { in: doctorIds } },
        });
        await prisma.holidays.deleteMany({
          where: { name: { contains: suffix } },
        });
        await prisma.appointments.deleteMany({ where: { id: appointmentId } });
        await prisma.schedules.deleteMany({
          where: { id: { in: scheduleIds } },
        });
        await prisma.patients.deleteMany({ where: { id: patientId } });
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

    const summarize = async (scope: Parameters<typeof repository.load>[0]) => {
      const rows = await repository.load(
        scope,
        day('2099-05-10'),
        day('2099-05-16'),
      );
      return {
        timezone: rows.timezone,
        doctors: rows.doctors.map((d) => d.id),
        schedules: rows.schedules.map((s) => s.doctorId),
        holidays: rows.holidays.map((h) => h.name.replace(` ${suffix}`, '')),
        blocks: rows.blocks.map((b) => b.doctorId),
        appointments: rows.appointments,
      };
    };

    it('el alcance de la sede 1 trae solo al médico A, el feriado global y el de la sede 1, sin bloqueos de B', async () => {
      const result = await summarize({ kind: 'clinic', clinicId: clinic1 });

      expect(result).toMatchObject({
        timezone: 'America/Lima',
        doctors: [doctorA],
        schedules: [doctorA],
        holidays: ['Global', 'Sede 1'],
        blocks: [],
      });
    });

    it('un SUPER_ADMIN pidiendo al médico A recibe lo mismo que la sede 1', async () => {
      const scope = await resolveAgendaScope(
        {
          id: 1,
          email: 'root@test.local',
          roleId: 1,
          roleName: 'SUPER_ADMIN',
          clinicId: null,
        },
        { doctorId: doctorA },
        repository,
      );

      expect(scope).toEqual({
        kind: 'doctor',
        doctorId: doctorA,
        clinicId: clinic1,
      });
      expect(await summarize(scope)).toEqual(
        await summarize({ kind: 'clinic', clinicId: clinic1 }),
      );
    });

    it('las citas traen del paciente solo id y nombre, y la especialidad aporta duración y descanso', async () => {
      const rows = await repository.load(
        { kind: 'doctor', doctorId: doctorA, clinicId: clinic1 },
        day('2099-05-10'),
        day('2099-05-10'),
      );

      expect(rows.appointments).toHaveLength(1);
      expect(rows.appointments[0]).toMatchObject({
        status: 'NO_SHOW',
        doctorId: doctorA,
      });
      expect(rows.appointments[0].patient).toEqual({
        id: patientId,
        name: 'Ana',
        lastName: 'Agenda',
      });
      expect(rows.schedules[0]).toMatchObject({
        durationMinutes: 30,
        bufferMinutes: 5,
      });
    });

    it('el médico se resuelve por su usuario y una sede inexistente no existe', async () => {
      const userId = (
        await prisma.profiles.findFirstOrThrow({
          where: { doctor: { id: doctorB } },
          select: { userId: true },
        })
      ).userId!;

      expect(await repository.findDoctorByUserId(userId)).toEqual({
        id: doctorB,
        clinicId: clinic2,
      });
      expect(await repository.clinicExists(clinic2)).toBe(true);
      expect(await repository.clinicExists(-1)).toBe(false);
    });
  },
);
