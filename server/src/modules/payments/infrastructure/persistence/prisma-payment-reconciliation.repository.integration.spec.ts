import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { VerifiedPaymentSnapshot } from '../../domain/repositories/payment-reconciliation.repository.js';
import { PrismaPaymentReconciliationRepository } from './prisma-payment-reconciliation.repository.js';
import { PrismaAppointmentRepository } from '../../../appointments/infrastructure/persistence/prisma-appointment.repository.js';
import { PrismaTransactionRepository } from './prisma-transaction.repository.js';
import { GetPaymentByAppointmentUseCase } from '../../application/use-cases/get-payment-by-appointment.use-case.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PrismaPaymentReconciliationRepository (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaPaymentReconciliationRepository(prisma);
  const appointmentRepository = new PrismaAppointmentRepository(prisma);
  const transactionRepository = new PrismaTransactionRepository(prisma);
  const suffix = `${process.pid}-${Date.now()}`;
  const appointmentIds: number[] = [];
  let clinicId: number;
  let otherClinicId: number;
  let patientId: number;
  let patientUserId: number;
  let doctorUserId: number;
  let scheduleId: number;

  const approvedSnapshot = (
    appointmentId: number,
    gatewayId: string,
  ): VerifiedPaymentSnapshot => ({
    appointmentId,
    gatewayId,
    externalRef: String(appointmentId),
    amount: 120,
    currency: 'PEN',
    status: 'PAID',
    paymentMethod: 'CREDIT_CARD',
    payerEmail: 'patient@mediclick.test',
    failureReason: null,
    paidAt: new Date('2026-08-30T20:00:00Z'),
    raw: { id: gatewayId, status: 'approved' },
  });

  const createAppointment = async (status: 'PENDING' | 'CANCELLED') => {
    const appointment = await prisma.appointments.create({
      data: {
        patientId,
        scheduleId,
        clinicId,
        startTime: new Date('1970-01-01T09:00:00Z'),
        endTime: new Date('1970-01-01T09:30:00Z'),
        status,
        paymentStatus: 'PENDING',
        amount: 120,
        pendingUntil: new Date('2026-08-30T19:00:00Z'),
      },
    });
    appointmentIds.push(appointment.id);
    return appointment;
  };

  beforeAll(async () => {
    await prisma.$connect();
    const clinic = await prisma.clinics.create({
      data: { name: `Payments clinic ${suffix}` },
    });
    clinicId = clinic.id;
    const otherClinic = await prisma.clinics.create({
      data: { name: `Other payments clinic ${suffix}` },
    });
    otherClinicId = otherClinic.id;
    const patientUser = await prisma.users.create({
      data: {
        name: 'Payment patient',
        email: `payment-patient@${suffix}.test`,
        password: 'integration-test-only',
      },
    });
    patientUserId = patientUser.id;
    const patientProfile = await prisma.profiles.create({
      data: {
        name: 'Payment',
        lastName: 'Patient',
        userId: patientUser.id,
      },
    });
    const patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: '999999999',
        bloodType: 'A+',
      },
    });
    patientId = patient.id;

    const doctorUser = await prisma.users.create({
      data: {
        name: 'Payment doctor',
        email: `payment-doctor@${suffix}.test`,
        password: 'integration-test-only',
        clinicId,
      },
    });
    doctorUserId = doctorUser.id;
    const doctorProfile = await prisma.profiles.create({
      data: {
        name: 'Payment',
        lastName: 'Doctor',
        userId: doctorUser.id,
      },
    });
    const doctor = await prisma.doctors.create({
      data: {
        profileId: doctorProfile.id,
        licenseNumber: `PAY-${suffix}`,
        clinicId,
      },
    });
    const category = await prisma.categories.create({
      data: { name: `Payment category ${suffix}` },
    });
    const specialty = await prisma.specialties.create({
      data: {
        name: `Payment specialty ${suffix}`,
        categoryId: category.id,
        duration: 30,
        price: 120,
      },
    });
    const schedule = await prisma.schedules.create({
      data: {
        doctorId: doctor.id,
        specialtyId: specialty.id,
        clinicId,
        scheduleDate: new Date('2026-09-01T00:00:00Z'),
        timeFrom: new Date('1970-01-01T09:00:00Z'),
        timeTo: new Date('1970-01-01T10:00:00Z'),
      },
    });
    scheduleId = schedule.id;
  });

  afterAll(async () => {
    await prisma.transactions.deleteMany({
      where: { appointmentId: { in: appointmentIds } },
    });
    await prisma.appointments.deleteMany({
      where: { id: { in: appointmentIds } },
    });
    await prisma.schedules.deleteMany({ where: { id: scheduleId } });
    await prisma.doctors.deleteMany({
      where: { licenseNumber: `PAY-${suffix}` },
    });
    await prisma.patients.deleteMany({ where: { id: patientId } });
    await prisma.profiles.deleteMany({
      where: { user: { email: { endsWith: `@${suffix}.test` } } },
    });
    await prisma.users.deleteMany({
      where: { email: { endsWith: `@${suffix}.test` } },
    });
    await prisma.specialties.deleteMany({
      where: { name: `Payment specialty ${suffix}` },
    });
    await prisma.categories.deleteMany({
      where: { name: `Payment category ${suffix}` },
    });
    await prisma.clinics.deleteMany({
      where: { id: { in: [clinicId, otherClinicId] } },
    });
    await prisma.onModuleDestroy();
  });

  it('keeps a cancelled appointment cancelled and flags financial review', async () => {
    const appointment = await createAppointment('CANCELLED');

    const result = await repository.reconcile(
      approvedSnapshot(appointment.id, `mp-cancelled-${suffix}`),
    );
    const persisted = await prisma.appointments.findUniqueOrThrow({
      where: { id: appointment.id },
    });
    const transaction = await prisma.transactions.findFirstOrThrow({
      where: { appointmentId: appointment.id },
    });

    expect(result).toMatchObject({
      appointmentStatus: 'CANCELLED',
      paymentStatus: 'PAID',
      financialReviewRequired: true,
    });
    expect(persisted.status).toBe('CANCELLED');
    expect(persisted.paymentStatus).toBe('PAID');
    expect(transaction.metadata).toEqual(
      expect.objectContaining({ needsFinancialReview: true }),
    );
  });

  it('reconciles duplicate concurrent deliveries idempotently', async () => {
    const appointment = await createAppointment('PENDING');
    const snapshot = approvedSnapshot(
      appointment.id,
      `mp-idempotent-${suffix}`,
    );

    await Promise.all([
      repository.reconcile(snapshot),
      repository.reconcile(snapshot),
    ]);

    await expect(
      prisma.transactions.count({
        where: {
          appointmentId: appointment.id,
          gatewayId: snapshot.gatewayId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('enforces payment visibility for patients, doctors, clinics and global admins', async () => {
    const appointment = await createAppointment('PENDING');
    await prisma.transactions.create({
      data: {
        appointmentId: appointment.id,
        clinicId,
        amount: 120,
        currency: 'PEN',
        status: 'PENDING',
      },
    });
    const useCase = new GetPaymentByAppointmentUseCase(
      prisma,
      transactionRepository,
      { execute: jest.fn() } as never,
      new AppointmentAccessPolicy(),
    );
    const actor = (
      id: number,
      roleName: SystemRole,
      actorClinicId: number | null,
    ): AuthenticatedUser => ({
      id,
      email: `actor-${id}@integration.test`,
      roleId: 1,
      roleName,
      clinicId: actorClinicId,
    });

    await expect(
      useCase.execute(
        actor(patientUserId, SystemRole.PATIENT, null),
        appointment.id,
      ),
    ).resolves.toMatchObject({ appointmentId: appointment.id });
    await expect(
      useCase.execute(actor(999_001, SystemRole.PATIENT, null), appointment.id),
    ).rejects.toThrow('Cita no encontrada');
    await expect(
      useCase.execute(
        actor(999_002, SystemRole.RECEPTIONIST, otherClinicId),
        appointment.id,
      ),
    ).rejects.toThrow('Cita no encontrada');
    await expect(
      useCase.execute(
        actor(999_003, SystemRole.RECEPTIONIST, clinicId),
        appointment.id,
      ),
    ).resolves.toMatchObject({ appointmentId: appointment.id });
    await expect(
      useCase.execute(
        actor(doctorUserId, SystemRole.DOCTOR, clinicId),
        appointment.id,
      ),
    ).resolves.toMatchObject({ appointmentId: appointment.id });
    await expect(
      useCase.execute(actor(999_004, SystemRole.ADMIN, null), appointment.id),
    ).resolves.toMatchObject({ appointmentId: appointment.id });
  });

  it('never resurrects an appointment during concurrent cancellation', async () => {
    for (let iteration = 0; iteration < 5; iteration++) {
      const appointment = await createAppointment('PENDING');
      await Promise.all([
        repository.reconcile(
          approvedSnapshot(
            appointment.id,
            `mp-race-${iteration}-${suffix}`,
          ),
        ),
        prisma.appointments.update({
          where: { id: appointment.id },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Concurrent cancellation test',
          },
        }),
      ]);

      const persisted = await prisma.appointments.findUniqueOrThrow({
        where: { id: appointment.id },
      });
      expect(persisted.status).toBe('CANCELLED');
      expect(persisted.paymentStatus).toBe('PAID');
    }
  });

  it('allows only valid outcomes when payment races expiration', async () => {
    for (let iteration = 0; iteration < 5; iteration++) {
      const appointment = await createAppointment('PENDING');
      await Promise.all([
        repository.reconcile(
          approvedSnapshot(
            appointment.id,
            `mp-expiry-race-${iteration}-${suffix}`,
          ),
        ),
        appointmentRepository.expirePendingPastDeadline(
          new Date('2026-08-30T20:00:00Z'),
        ),
      ]);

      const persisted = await prisma.appointments.findUniqueOrThrow({
        where: { id: appointment.id },
      });
      const transaction = await prisma.transactions.findFirstOrThrow({
        where: { appointmentId: appointment.id },
      });

      expect(['CONFIRMED', 'CANCELLED']).toContain(persisted.status);
      expect(persisted.paymentStatus).toBe('PAID');
      if (persisted.status === 'CANCELLED') {
        expect(transaction.metadata).toEqual(
          expect.objectContaining({ needsFinancialReview: true }),
        );
      }
    }
  });
});
