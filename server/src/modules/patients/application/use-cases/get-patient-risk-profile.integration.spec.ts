import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaPatientRepository } from '../../infrastructure/persistence/prisma-patient.repository.js';
import { PatientRiskService } from '../../domain/services/patient-risk.service.js';
import { PatientRiskAccessPolicy } from '../../../../shared/access/patient-risk-access.policy.js';
import { GetPatientRiskProfileUseCase } from './get-patient-risk-profile.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('GetPatientRiskProfileUseCase (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const patientRepository = new PrismaPatientRepository(prisma);
  const riskService = new PatientRiskService();
  const accessPolicy = new PatientRiskAccessPolicy();
  const useCase = new GetPatientRiskProfileUseCase(
    patientRepository,
    prisma,
    riskService,
    accessPolicy,
  );

  const suffix = `${process.pid}-${Date.now()}`;
  const appointmentIds: number[] = [];
  let clinicAId: number;
  let clinicBId: number;
  let patientId: number;
  let patientUserId: number;
  let doctorA1UserId: number;
  let scheduleA1Id: number;
  let scheduleA2Id: number;
  let scheduleB1Id: number;

  beforeAll(async () => {
    await prisma.$connect();
    const clinicA = await prisma.clinics.create({
      data: { name: `Risk Clinic A ${suffix}` },
    });
    clinicAId = clinicA.id;

    const clinicB = await prisma.clinics.create({
      data: { name: `Risk Clinic B ${suffix}` },
    });
    clinicBId = clinicB.id;

    const patientUser = await prisma.users.create({
      data: {
        name: 'Risk Patient',
        email: `risk-patient@${suffix}.test`,
        password: 'password',
      },
    });
    patientUserId = patientUser.id;

    const patientProfile = await prisma.profiles.create({
      data: {
        name: 'Risk',
        lastName: 'Patient',
        userId: patientUser.id,
      },
    });

    const patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: '999999999',
        bloodType: 'O+',
      },
    });
    patientId = patient.id;

    const category = await prisma.categories.create({
      data: { name: `Category ${suffix}` },
    });

    const specialty = await prisma.specialties.create({
      data: {
        name: `Specialty ${suffix}`,
        categoryId: category.id,
        duration: 30,
        price: 100,
      },
    });

    // Doctor A1 in Clinic A
    const doctorA1User = await prisma.users.create({
      data: {
        name: 'Doctor A1',
        email: `doctor-a1@${suffix}.test`,
        password: 'password',
        clinicId: clinicAId,
      },
    });
    doctorA1UserId = doctorA1User.id;
    const profileA1 = await prisma.profiles.create({
      data: { name: 'Doctor', lastName: 'A1', userId: doctorA1User.id },
    });
    const doctorA1 = await prisma.doctors.create({
      data: {
        profileId: profileA1.id,
        licenseNumber: `DOC-A1-${suffix}`,
        clinicId: clinicAId,
      },
    });
    const scheduleA1 = await prisma.schedules.create({
      data: {
        doctorId: doctorA1.id,
        specialtyId: specialty.id,
        clinicId: clinicAId,
        scheduleDate: new Date('2026-09-01T00:00:00Z'),
        timeFrom: new Date('1970-01-01T08:00:00Z'),
        timeTo: new Date('1970-01-01T18:00:00Z'),
      },
    });
    scheduleA1Id = scheduleA1.id;

    // Doctor A2 in Clinic A
    const doctorA2User = await prisma.users.create({
      data: {
        name: 'Doctor A2',
        email: `doctor-a2@${suffix}.test`,
        password: 'password',
        clinicId: clinicAId,
      },
    });
    const profileA2 = await prisma.profiles.create({
      data: { name: 'Doctor', lastName: 'A2', userId: doctorA2User.id },
    });
    const doctorA2 = await prisma.doctors.create({
      data: {
        profileId: profileA2.id,
        licenseNumber: `DOC-A2-${suffix}`,
        clinicId: clinicAId,
      },
    });
    const scheduleA2 = await prisma.schedules.create({
      data: {
        doctorId: doctorA2.id,
        specialtyId: specialty.id,
        clinicId: clinicAId,
        scheduleDate: new Date('2026-09-01T00:00:00Z'),
        timeFrom: new Date('1970-01-01T08:00:00Z'),
        timeTo: new Date('1970-01-01T18:00:00Z'),
      },
    });
    scheduleA2Id = scheduleA2.id;

    // Doctor B1 in Clinic B
    const doctorB1User = await prisma.users.create({
      data: {
        name: 'Doctor B1',
        email: `doctor-b1@${suffix}.test`,
        password: 'password',
        clinicId: clinicBId,
      },
    });
    const profileB1 = await prisma.profiles.create({
      data: { name: 'Doctor', lastName: 'B1', userId: doctorB1User.id },
    });
    const doctorB1 = await prisma.doctors.create({
      data: {
        profileId: profileB1.id,
        licenseNumber: `DOC-B1-${suffix}`,
        clinicId: clinicBId,
      },
    });
    const scheduleB1 = await prisma.schedules.create({
      data: {
        doctorId: doctorB1.id,
        specialtyId: specialty.id,
        clinicId: clinicBId,
        scheduleDate: new Date('2026-09-01T00:00:00Z'),
        timeFrom: new Date('1970-01-01T08:00:00Z'),
        timeTo: new Date('1970-01-01T18:00:00Z'),
      },
    });
    scheduleB1Id = scheduleB1.id;

    const createAppt = async (data: {
      scheduleId: number;
      clinicId: number;
      status: string;
      cancellationFee?: number;
    }) => {
      const a = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId: data.scheduleId,
          clinicId: data.clinicId,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T09:30:00Z'),
          status: data.status,
          paymentStatus: 'PENDING',
          cancellationFee: data.cancellationFee ?? null,
        },
      });
      appointmentIds.push(a.id);
      return a;
    };

    // Clinic A, Doctor A1:
    // 1 NO_SHOW
    await createAppt({
      scheduleId: scheduleA1Id,
      clinicId: clinicAId,
      status: 'NO_SHOW',
    });
    // 1 COMPLETED
    await createAppt({
      scheduleId: scheduleA1Id,
      clinicId: clinicAId,
      status: 'COMPLETED',
    });
    // 1 late CANCELLED (cancellationFee > 0)
    await createAppt({
      scheduleId: scheduleA1Id,
      clinicId: clinicAId,
      status: 'CANCELLED',
      cancellationFee: 50,
    });
    // 1 early CANCELLED (cancellationFee null)
    await createAppt({
      scheduleId: scheduleA1Id,
      clinicId: clinicAId,
      status: 'CANCELLED',
    });
    // 9 future appointments (CONFIRMED / PENDING)
    for (let i = 0; i < 5; i++) {
      await createAppt({
        scheduleId: scheduleA1Id,
        clinicId: clinicAId,
        status: 'CONFIRMED',
      });
    }
    for (let i = 0; i < 4; i++) {
      await createAppt({
        scheduleId: scheduleA1Id,
        clinicId: clinicAId,
        status: 'PENDING',
      });
    }

    // Clinic A, Doctor A2:
    // 1 NO_SHOW
    await createAppt({
      scheduleId: scheduleA2Id,
      clinicId: clinicAId,
      status: 'NO_SHOW',
    });

    // Clinic B, Doctor B1:
    // 1 NO_SHOW, 1 COMPLETED
    await createAppt({
      scheduleId: scheduleB1Id,
      clinicId: clinicBId,
      status: 'NO_SHOW',
    });
    await createAppt({
      scheduleId: scheduleB1Id,
      clinicId: clinicBId,
      status: 'COMPLETED',
    });
  });

  afterAll(async () => {
    await prisma.appointments.deleteMany({
      where: { id: { in: appointmentIds } },
    });
    await prisma.schedules.deleteMany({
      where: { id: { in: [scheduleA1Id, scheduleA2Id, scheduleB1Id] } },
    });
    await prisma.doctors.deleteMany({
      where: {
        licenseNumber: {
          in: [`DOC-A1-${suffix}`, `DOC-A2-${suffix}`, `DOC-B1-${suffix}`],
        },
      },
    });
    await prisma.patients.deleteMany({ where: { id: patientId } });
    await prisma.profiles.deleteMany({
      where: { user: { email: { endsWith: `@${suffix}.test` } } },
    });
    await prisma.users.deleteMany({
      where: { email: { endsWith: `@${suffix}.test` } },
    });
    await prisma.specialties.deleteMany({
      where: { name: `Specialty ${suffix}` },
    });
    await prisma.categories.deleteMany({
      where: { name: `Category ${suffix}` },
    });
    await prisma.clinics.deleteMany({
      where: { id: { in: [clinicAId, clinicBId] } },
    });
    await prisma.onModuleDestroy();
  });

  it('Step 1: excluye citas futuras y cancelaciones tempranas del denominador para el cálculo de riesgo', async () => {
    // Para Doctor A1 en Clinic A:
    // Citas históricas comparables: 1 NO_SHOW, 1 COMPLETED, 1 late CANCELLED = 3 totalAppointments
    // Excluidas del denominador: 1 early CANCELLED, 9 future (5 CONFIRMED, 4 PENDING)
    const doctorA1Actor: AuthenticatedUser = {
      id: doctorA1UserId,
      email: `doctor-a1@${suffix}.test`,
      roleId: 3,
      roleName: 'DOCTOR',
      clinicId: clinicAId,
    };

    const result = await useCase.execute(patientId, doctorA1Actor);

    expect(result.stats).toEqual({
      totalAppointments: 3,
      noShowCount: 1,
      lateCancellationCount: 1,
    });
  });

  it('Step 2: acota las estadísticas según el actor y la sede', async () => {
    const receptionistAActor: AuthenticatedUser = {
      id: 9991,
      email: `recep-a@${suffix}.test`,
      roleId: 2,
      roleName: 'RECEPTIONIST',
      clinicId: clinicAId,
    };

    // Staff de Sede A ve Doctor A1 (3 hist) + Doctor A2 (1 NO_SHOW) = 4 totalAppointments
    const recepResult = await useCase.execute(patientId, receptionistAActor);
    expect(recepResult.stats).toEqual({
      totalAppointments: 4,
      noShowCount: 2,
      lateCancellationCount: 1,
    });

    // Paciente propio ve todas las sedes (Clinic A: 4 hist, Clinic B: 2 hist = 6 totalAppointments)
    const patientActor: AuthenticatedUser = {
      id: patientUserId,
      email: `risk-patient@${suffix}.test`,
      roleId: 1,
      roleName: 'PATIENT',
      clinicId: null,
    };
    const patientResult = await useCase.execute(patientId, patientActor);
    expect(patientResult.stats).toEqual({
      totalAppointments: 6,
      noShowCount: 3,
      lateCancellationCount: 1,
    });

    // Admin global ve todas las sedes
    const globalAdminActor: AuthenticatedUser = {
      id: 1,
      email: `admin@${suffix}.test`,
      roleId: 4,
      roleName: 'ADMIN',
      clinicId: null,
    };
    const adminResult = await useCase.execute(patientId, globalAdminActor);
    expect(adminResult.stats).toEqual({
      totalAppointments: 6,
      noShowCount: 3,
      lateCancellationCount: 1,
    });
  });
});
