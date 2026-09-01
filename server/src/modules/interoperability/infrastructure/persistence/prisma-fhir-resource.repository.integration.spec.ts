import { randomUUID } from 'node:crypto';
import type { Resource } from '@medplum/fhirtypes';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaFhirResourceRepository } from './prisma-fhir-resource.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaFhirResourceRepository durable projections (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaFhirResourceRepository(prisma);
    const suffix = `fhir-outbox-${process.pid}-${Date.now()}`;
    const consumerName = `${suffix}-consumer`;
    const resourceIds: string[] = [];
    const eventIds: string[] = [];

    beforeAll(async () => {
      await prisma.$connect();
    });

    afterAll(async () => {
      if (resourceIds.length > 0) {
        await prisma.fhirResourceHistory.deleteMany({
          where: { resourceId: { in: resourceIds } },
        });
        await prisma.fhirResource.deleteMany({
          where: { id: { in: resourceIds } },
        });
      }
      if (eventIds.length > 0) {
        await prisma.outboxConsumptions.deleteMany({
          where: { eventId: { in: eventIds } },
        });
      }
      await prisma.onModuleDestroy();
    });

    const projection = (eventId: string, resourceId: string) => ({
      consumerName,
      eventId,
      occurredAt: new Date('2026-07-10T14:00:00.000Z'),
      upserts: [
        {
          id: resourceId,
          resourceType: 'Patient',
          content: { resourceType: 'Patient', active: true } as Resource,
          clinicId: null,
        },
        {
          id: `${resourceId}-provenance`,
          resourceType: 'Provenance',
          content: { resourceType: 'Provenance' } as Resource,
          clinicId: null,
        },
      ],
    });

    it('redelivery del mismo eventId no crea nuevas versiones ni historial', async () => {
      const eventId = randomUUID();
      const resourceId = `${suffix}-redelivery`;
      eventIds.push(eventId);
      resourceIds.push(resourceId, `${resourceId}-provenance`);

      await expect(
        repository.applyProjection(projection(eventId, resourceId)),
      ).resolves.toBe('applied');
      await expect(
        repository.applyProjection(projection(eventId, resourceId)),
      ).resolves.toBe('duplicate');

      await expect(
        prisma.fhirResourceHistory.count({
          where: { resourceId: { in: resourceIds.slice(-2) } },
        }),
      ).resolves.toBe(2);
      await expect(
        prisma.outboxConsumptions.count({ where: { consumerName, eventId } }),
      ).resolves.toBe(1);
    });

    it('eventos distintos concurrentes se serializan y crean versiones monotónicas', async () => {
      const firstEventId = randomUUID();
      const secondEventId = randomUUID();
      const resourceId = `${suffix}-concurrent`;
      eventIds.push(firstEventId, secondEventId);
      resourceIds.push(resourceId, `${resourceId}-provenance`);

      await Promise.all([
        repository.applyProjection(projection(firstEventId, resourceId)),
        repository.applyProjection(projection(secondEventId, resourceId)),
      ]);

      const resource = await prisma.fhirResource.findUniqueOrThrow({
        where: { id: resourceId },
      });
      const history = await prisma.fhirResourceHistory.findMany({
        where: { resourceId },
        orderBy: { versionId: 'asc' },
      });
      expect(resource.versionId).toBe(2);
      expect(history.map((row) => row.versionId)).toEqual([1, 2]);
    });

    it('revierte recibo, recurso e historial si una parte de la proyección falla', async () => {
      const eventId = randomUUID();
      const resourceId = `${suffix}-rollback`;
      eventIds.push(eventId);
      resourceIds.push(resourceId);

      await expect(
        repository.applyProjection({
          consumerName,
          eventId,
          occurredAt: new Date(),
          upserts: [
            {
              id: resourceId,
              resourceType: 'Patient',
              content: { resourceType: 'Patient' } as Resource,
              clinicId: null,
            },
            {
              id: resourceId,
              resourceType: 'Encounter',
              content: { resourceType: 'Encounter' } as Resource,
              clinicId: null,
            },
          ],
        }),
      ).rejects.toThrow('ya pertenece a Patient');

      await expect(
        prisma.outboxConsumptions.count({ where: { consumerName, eventId } }),
      ).resolves.toBe(0);
      await expect(
        prisma.fhirResource.count({ where: { id: resourceId } }),
      ).resolves.toBe(0);
      await expect(
        prisma.fhirResourceHistory.count({ where: { resourceId } }),
      ).resolves.toBe(0);
    });
  },
);
