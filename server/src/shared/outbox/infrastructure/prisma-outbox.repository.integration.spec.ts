import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildDurableEvent } from '../domain/durable-domain-event.js';
import {
  OutboxContractConflictError,
  recordOutboxEvent,
} from './prisma-outbox-writer.js';
import { PrismaOutboxRepository } from './prisma-outbox.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PrismaOutboxRepository (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaOutboxRepository(prisma);
  const suiteOperationPrefix = `outbox-${process.pid}-${Date.now()}`;
  // Ventana anterior al uso real de MediClick: evita reclamar eventos ajenos
  // cuando la suite corre contra una base local que no está vacía.
  const testNow = new Date('2000-01-01T00:00:00.000Z');

  const createEvent = async (
    operationSuffix: string,
    occurredAt = new Date(testNow.getTime() - 1),
  ) => {
    const event = buildDurableEvent({
      type: 'test.slot_released',
      schemaVersion: 1,
      aggregateType: 'appointment',
      aggregateId: operationSuffix,
      operationId: `${suiteOperationPrefix}-${operationSuffix}`,
      clinicId: null,
      occurredAt,
      payload: { appointmentId: operationSuffix },
    });
    await prisma.$transaction((tx) => recordOutboxEvent(tx, event));
    await prisma.outboxEvents.update({
      where: { eventId: event.eventId },
      data: { availableAt: occurredAt },
    });
    return event;
  };

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    await prisma.outboxEvents.deleteMany({
      where: { operationId: { startsWith: suiteOperationPrefix } },
    });
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('reclama cada evento una sola vez entre dos workers concurrentes', async () => {
    const now = testNow;
    await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        createEvent(`concurrent-${index}`, new Date(now.getTime() - 1000)),
      ),
    );

    const [workerA, workerB] = await Promise.all([
      repository.claimBatch(`owner-a-${randomUUID()}`, now, 6, 30_000),
      repository.claimBatch(`owner-b-${randomUUID()}`, now, 6, 30_000),
    ]);
    const ids = [...workerA, ...workerB].map((event) => event.eventId);

    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it('permite reclamar un lease vencido e incrementa attempts', async () => {
    const firstNow = testNow;
    const event = await createEvent(
      'expired-lease',
      new Date(firstNow.getTime() - 1),
    );
    const [first] = await repository.claimBatch(
      'crashed-worker',
      firstNow,
      1,
      50,
    );

    const [reclaimed] = await repository.claimBatch(
      'replacement-worker',
      new Date(firstNow.getTime() + 51),
      1,
      50,
    );

    expect(first.eventId).toBe(event.eventId);
    expect(first.attempts).toBe(1);
    expect(reclaimed.eventId).toBe(event.eventId);
    expect(reclaimed.attempts).toBe(2);
  });

  it('solo permite ack y reschedule al owner con lease vigente', async () => {
    const now = testNow;
    await createEvent('owner-check', new Date(now.getTime() - 1));
    const [claimed] = await repository.claimBatch('right-owner', now, 1, 1000);

    await expect(
      repository.ack(claimed.eventId, 'wrong-owner', now),
    ).resolves.toBe(false);
    await expect(
      repository.reschedule(
        claimed.eventId,
        'wrong-owner',
        now,
        claimed.attempts,
        'redacted',
        { maxAttempts: 3, delayMs: 500 },
      ),
    ).resolves.toBe('lease-lost');
    await expect(
      repository.ack(claimed.eventId, 'right-owner', now),
    ).resolves.toBe(true);
  });

  it('reprograma con backoff y conserva el evento como dead letter al agotar intentos', async () => {
    const now = testNow;
    const event = await createEvent('dead-letter', new Date(now.getTime() - 1));
    const [first] = await repository.claimBatch('worker', now, 1, 1000);

    await expect(
      repository.reschedule(
        first.eventId,
        'worker',
        now,
        first.attempts,
        'falló',
        {
          maxAttempts: 2,
          delayMs: 100,
        },
      ),
    ).resolves.toBe('rescheduled');

    const [second] = await repository.claimBatch(
      'worker',
      new Date(now.getTime() + 101),
      1,
      1000,
    );
    await expect(
      repository.reschedule(
        second.eventId,
        'worker',
        new Date(now.getTime() + 101),
        second.attempts,
        'falló otra vez',
        { maxAttempts: 2, delayMs: 100 },
      ),
    ).resolves.toBe('dead-lettered');

    const deadLetter = await prisma.outboxEvents.findUniqueOrThrow({
      where: { eventId: event.eventId },
    });
    const originalSnapshot = {
      eventId: deadLetter.eventId,
      dedupeKey: deadLetter.dedupeKey,
      payload: deadLetter.payload,
    };
    expect(deadLetter.deadLetteredAt).not.toBeNull();

    await expect(
      repository.replay(event.eventId, new Date(now.getTime() + 500)),
    ).resolves.toBe(true);
    const replayed = await prisma.outboxEvents.findUniqueOrThrow({
      where: { eventId: event.eventId },
    });
    expect({
      eventId: replayed.eventId,
      dedupeKey: replayed.dedupeKey,
      payload: replayed.payload,
    }).toEqual(originalSnapshot);
    expect(replayed.deadLetteredAt).toBeNull();
    expect(replayed.attempts).toBe(0);
  });

  it('trata mismo envelope como no-op y rechaza reutilizar la clave con contenido distinto', async () => {
    const event = await createEvent('dedupe');

    await expect(
      prisma.$transaction((tx) => recordOutboxEvent(tx, event)),
    ).resolves.toBeUndefined();
    await expect(
      prisma.$transaction((tx) =>
        recordOutboxEvent(tx, {
          ...event,
          payload: { appointmentId: 'different' },
        }),
      ),
    ).rejects.toBeInstanceOf(OutboxContractConflictError);

    await expect(
      prisma.outboxEvents.count({ where: { eventId: event.eventId } }),
    ).resolves.toBe(1);
  });
});
