import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { buildAppointmentSlotReleasedDurableEvent } from '../../../../shared/events/appointment-durable-events.js';
import {
  OutboxContractConflictError,
  recordOutboxEvent,
} from '../../../../shared/outbox/infrastructure/prisma-outbox-writer.js';
import { PrismaAppointmentRepository } from './prisma-appointment.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaAppointmentRepository outbox boundaries (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaAppointmentRepository(prisma);
    const suffix = `appointment-outbox-${process.pid}-${Date.now()}`;
    const operationPrefix = `${suffix}-operation`;
    const appointmentIds: number[] = [];
    let clinicId: number;
    let doctorId: number;
    let patientId: number;
    let scheduleAId: number;
    let scheduleBId: number;

    const createAppointment = async (
      overrides: Partial<{
        scheduleId: number;
        startTime: Date;
        endTime: Date;
        status: AppointmentStatus;
        paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
        pendingUntil: Date | null;
      }> = {},
    ) => {
      const appointment = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId: overrides.scheduleId ?? scheduleAId,
          startTime:
            overrides.startTime ?? new Date('1970-01-01T09:00:00.000Z'),
          endTime: overrides.endTime ?? new Date('1970-01-01T09:30:00.000Z'),
          status: overrides.status ?? AppointmentStatus.PENDING,
          paymentStatus: overrides.paymentStatus ?? 'PENDING',
          pendingUntil: overrides.pendingUntil,
          clinicId,
        },
      });
      appointmentIds.push(appointment.id);
      return appointment;
    };

    beforeAll(async () => {
      await prisma.$connect();
      const clinic = await prisma.clinics.create({
        data: { name: `Appointment outbox clinic ${suffix}` },
      });
      clinicId = clinic.id;

      const doctorUser = await prisma.users.create({
        data: {
          name: 'Outbox doctor',
          email: `doctor@${suffix}.test`,
          password: 'integration-test-only',
          clinicId,
        },
      });
      const doctorProfile = await prisma.profiles.create({
        data: { name: 'Outbox', lastName: 'Doctor', userId: doctorUser.id },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: doctorProfile.id,
          licenseNumber: `OUTBOX-${suffix}`,
          clinicId,
        },
      });
      doctorId = doctor.id;

      const category = await prisma.categories.create({
        data: { name: `Appointment outbox category ${suffix}` },
      });
      const specialty = await prisma.specialties.create({
        data: {
          name: `Appointment outbox specialty ${suffix}`,
          categoryId: category.id,
          duration: 30,
          price: 100,
        },
      });
      const scheduleDate = new Date('2099-08-31T00:00:00.000Z');
      const scheduleA = await prisma.schedules.create({
        data: {
          doctorId,
          specialtyId: specialty.id,
          clinicId,
          scheduleDate,
          timeFrom: new Date('1970-01-01T08:00:00.000Z'),
          timeTo: new Date('1970-01-01T12:00:00.000Z'),
        },
      });
      scheduleAId = scheduleA.id;
      const scheduleB = await prisma.schedules.create({
        data: {
          doctorId,
          specialtyId: specialty.id,
          clinicId,
          scheduleDate,
          timeFrom: new Date('1970-01-01T13:00:00.000Z'),
          timeTo: new Date('1970-01-01T17:00:00.000Z'),
        },
      });
      scheduleBId = scheduleB.id;

      const patientUser = await prisma.users.create({
        data: {
          name: 'Outbox patient',
          email: `patient@${suffix}.test`,
          password: 'integration-test-only',
        },
      });
      const patientProfile = await prisma.profiles.create({
        data: { name: 'Outbox', lastName: 'Patient', userId: patientUser.id },
      });
      const patient = await prisma.patients.create({
        data: {
          profileId: patientProfile.id,
          emergencyContact: '999999999',
          bloodType: 'O+',
        },
      });
      patientId = patient.id;
    });

    afterAll(async () => {
      await prisma.outboxEvents.deleteMany({
        where: { operationId: { startsWith: operationPrefix } },
      });
      if (appointmentIds.length > 0) {
        await prisma.transactions.deleteMany({
          where: { appointmentId: { in: appointmentIds } },
        });
        await prisma.appointments.deleteMany({
          where: { id: { in: appointmentIds } },
        });
      }
      const scheduleIds = [scheduleAId, scheduleBId].filter(Number.isInteger);
      if (scheduleIds.length > 0) {
        await prisma.schedules.deleteMany({
          where: { id: { in: scheduleIds } },
        });
      }
      await prisma.specialties.deleteMany({
        where: { name: `Appointment outbox specialty ${suffix}` },
      });
      await prisma.categories.deleteMany({
        where: { name: `Appointment outbox category ${suffix}` },
      });
      if (Number.isInteger(patientId)) {
        await prisma.patients.deleteMany({ where: { id: patientId } });
      }
      if (Number.isInteger(doctorId)) {
        await prisma.doctors.deleteMany({ where: { id: doctorId } });
      }
      await prisma.profiles.deleteMany({
        where: { user: { email: { endsWith: `@${suffix}.test` } } },
      });
      await prisma.users.deleteMany({
        where: { email: { endsWith: `@${suffix}.test` } },
      });
      if (Number.isInteger(clinicId)) {
        await prisma.clinics.deleteMany({ where: { id: clinicId } });
      }
      await prisma.onModuleDestroy();
    });

    it('confirma cancelación, revisión financiera y dos eventos en una sola transacción', async () => {
      const appointment = await createAppointment({ paymentStatus: 'PAID' });
      const transaction = await prisma.transactions.create({
        data: {
          appointmentId: appointment.id,
          amount: 100,
          status: 'PAID',
          clinicId,
          metadata: { source: 'integration-test' },
        },
      });
      const operationId = `${operationPrefix}-cancel-success`;

      const result = await repository.cancelAtomically({
        appointmentId: appointment.id,
        reason: 'Paciente canceló',
        cancelledBy: 'PATIENT',
        eventIdentity: {
          operationId,
          cancelledEventId: randomUUID(),
          slotReleasedEventId: randomUUID(),
          occurredAt: new Date(),
        },
      });

      expect(result.transitioned).toBe(true);
      expect(result.refundReviewTransactionId).toBe(transaction.id);
      const persistedTransaction = await prisma.transactions.findUniqueOrThrow({
        where: { id: transaction.id },
      });
      expect(persistedTransaction.metadata).toMatchObject({
        source: 'integration-test',
        needsRefund: true,
        refundCancelledBy: 'PATIENT',
      });
      const events = await prisma.outboxEvents.findMany({
        where: { operationId },
        orderBy: { type: 'asc' },
      });
      expect(events.map((event) => event.type)).toEqual([
        'appointment.cancelled',
        'appointment.slot_released',
      ]);
      expect(events.every((event) => event.clinicId === clinicId)).toBe(true);
    });

    it('revierte cita y finanzas si el evento contradice una dedupeKey existente', async () => {
      const appointment = await createAppointment({ paymentStatus: 'PAID' });
      const transaction = await prisma.transactions.create({
        data: {
          appointmentId: appointment.id,
          amount: 100,
          status: 'PAID',
          clinicId,
        },
      });
      const operationId = `${operationPrefix}-cancel-rollback`;
      const slotReleasedEventId = randomUUID();
      await prisma.$transaction((tx) =>
        recordOutboxEvent(
          tx,
          buildAppointmentSlotReleasedDurableEvent({
            eventId: randomUUID(),
            operationId,
            occurredAt: new Date('2026-08-31T12:00:00.000Z'),
            appointmentId: appointment.id,
            scheduleId: 999999,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            clinicId,
          }),
        ),
      );

      await expect(
        repository.cancelAtomically({
          appointmentId: appointment.id,
          reason: 'debe revertir',
          cancelledBy: 'TEST',
          eventIdentity: {
            operationId,
            cancelledEventId: randomUUID(),
            slotReleasedEventId,
            occurredAt: new Date(),
          },
        }),
      ).rejects.toBeInstanceOf(OutboxContractConflictError);

      const persistedAppointment = await prisma.appointments.findUniqueOrThrow({
        where: { id: appointment.id },
      });
      const persistedTransaction = await prisma.transactions.findUniqueOrThrow({
        where: { id: transaction.id },
      });
      expect(persistedAppointment.status).toBe(AppointmentStatus.PENDING);
      expect(persistedTransaction.metadata).toBeNull();
      await expect(
        prisma.outboxEvents.count({
          where: { operationId, type: 'appointment.cancelled' },
        }),
      ).resolves.toBe(0);
    });

    it('reagenda y registra el slot viejo dentro de la transacción serializable', async () => {
      const appointment = await createAppointment();
      const operationId = `${operationPrefix}-reschedule`;
      const newStart = new Date('1970-01-01T14:00:00.000Z');
      const newEnd = new Date('1970-01-01T14:30:00.000Z');

      await repository.rescheduleWithOverlapCheck(
        appointment.id,
        {
          scheduleId: scheduleBId,
          startTime: newStart,
          endTime: newEnd,
          status: AppointmentStatus.PENDING,
        },
        scheduleBId,
        newStart,
        newEnd,
        {
          operationId,
          slotReleasedEventId: randomUUID(),
          occurredAt: new Date(),
        },
      );

      const persisted = await prisma.appointments.findUniqueOrThrow({
        where: { id: appointment.id },
      });
      expect(persisted.scheduleId).toBe(scheduleBId);
      const event = await prisma.outboxEvents.findFirstOrThrow({
        where: { operationId },
      });
      expect(event.payload).toMatchObject({
        appointmentId: appointment.id,
        scheduleId: scheduleAId,
        startTime: '1970-01-01T09:00:00.000Z',
        endTime: '1970-01-01T09:30:00.000Z',
      });
    });

    it('expira condicionalmente y registra cada liberación antes del commit', async () => {
      const appointment = await createAppointment({
        pendingUntil: new Date('2020-01-01T00:00:00.000Z'),
      });
      const operationId = `${operationPrefix}-expiration`;
      const now = new Date();

      const expired = await repository.expirePendingPastDeadline(now, {
        operationId,
        occurredAt: now,
      });

      expect(expired.map((slot) => slot.id)).toContain(appointment.id);
      const event = await prisma.outboxEvents.findFirstOrThrow({
        where: { operationId: `${operationId}:${appointment.id}` },
      });
      expect(event.clinicId).toBe(clinicId);
      const persisted = await prisma.appointments.findUniqueOrThrow({
        where: { id: appointment.id },
      });
      expect(persisted.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('confirma manualmente y registra el evento durable en el mismo commit', async () => {
      const appointment = await createAppointment();
      const operationId = `${operationPrefix}-manual-confirm`;

      const confirmed = await repository.confirmAtomically(appointment.id, {
        operationId,
        eventId: randomUUID(),
        occurredAt: new Date(),
      });

      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);
      const event = await prisma.outboxEvents.findFirstOrThrow({
        where: { operationId },
      });
      expect(event.type).toBe('appointment.confirmed');
      expect(event.payload).toEqual({ appointmentId: appointment.id });
    });
  },
);
