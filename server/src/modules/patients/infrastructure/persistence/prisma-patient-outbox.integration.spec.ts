import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  PATIENT_UPDATED_EVENT,
  buildPatientChangedDurableEvent,
} from '../../../../shared/events/patient-events.interface.js';
import {
  OutboxContractConflictError,
  recordOutboxEvent,
} from '../../../../shared/outbox/infrastructure/prisma-outbox-writer.js';
import { PrismaPatientRepository } from './prisma-patient.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaPatientRepository outbox boundaries (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaPatientRepository(prisma);
    const suffix = `patient-outbox-${process.pid}-${Date.now()}`;
    const operationPrefix = `${suffix}-operation`;
    let patientId: number;
    let profileId: number;
    let userId: number;

    beforeAll(async () => {
      await prisma.$connect();
    });

    afterAll(async () => {
      await prisma.outboxEvents.deleteMany({
        where: { operationId: { startsWith: operationPrefix } },
      });
      if (Number.isInteger(patientId)) {
        await prisma.patients.deleteMany({ where: { id: patientId } });
      }
      if (Number.isInteger(profileId)) {
        await prisma.profiles.deleteMany({ where: { id: profileId } });
      }
      if (Number.isInteger(userId)) {
        await prisma.users.deleteMany({ where: { id: userId } });
      }
      await prisma.onModuleDestroy();
    });

    it('crea user, profile, patient y patient.created en un solo commit multi-sede', async () => {
      const operationId = `${operationPrefix}-create`;
      const patient = await repository.create(
        {
          user: {
            name: 'Patient Outbox',
            email: `${suffix}@example.test`,
            password: 'integration-test-only',
          },
          profile: { name: 'Patient', lastName: 'Outbox' },
          patient: { emergencyContact: '999999999', bloodType: 'O+' },
        },
        {
          operationId,
          eventId: randomUUID(),
          occurredAt: new Date(),
        },
      );
      patientId = patient.id;
      profileId = patient.profileId;
      userId = patient.profile.userId!;

      const event = await prisma.outboxEvents.findFirstOrThrow({
        where: { operationId },
      });
      expect(event.type).toBe('patient.created');
      expect(event.clinicId).toBeNull();
      expect(event.payload).toEqual({ patientId });
    });

    it('revierte perfil y paciente si patient.updated contradice la dedupeKey', async () => {
      const operationId = `${operationPrefix}-update-rollback`;
      await prisma.$transaction((tx) =>
        recordOutboxEvent(
          tx,
          buildPatientChangedDurableEvent({
            eventId: randomUUID(),
            type: PATIENT_UPDATED_EVENT,
            operationId,
            occurredAt: new Date('2026-08-31T12:00:00.000Z'),
            patientId,
          }),
        ),
      );

      await expect(
        repository.update(
          patientId,
          {
            profile: { name: 'Should rollback' },
            patient: { bloodType: 'A+' },
          },
          {
            operationId,
            eventId: randomUUID(),
            occurredAt: new Date(),
          },
        ),
      ).rejects.toBeInstanceOf(OutboxContractConflictError);

      const patient = await prisma.patients.findUniqueOrThrow({
        where: { id: patientId },
        include: { profile: true },
      });
      expect(patient.profile.name).toBe('Patient');
      expect(patient.bloodType).toBe('O+');
    });

    it('soft-borra y registra patient.deleted atómicamente', async () => {
      const operationId = `${operationPrefix}-delete`;

      await repository.softDelete(patientId, {
        operationId,
        eventId: randomUUID(),
        occurredAt: new Date(),
      });

      const patient = await prisma.patients.findUniqueOrThrow({
        where: { id: patientId },
      });
      const event = await prisma.outboxEvents.findFirstOrThrow({
        where: { operationId },
      });
      expect(patient.deleted).toBe(true);
      expect(event.type).toBe('patient.deleted');
    });
  },
);
