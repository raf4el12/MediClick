import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  buildDurableEvent,
  durableEventName,
  type DurableDomainEvent,
} from '../domain/durable-domain-event.js';
import { PrismaOutboxRepository } from '../infrastructure/prisma-outbox.repository.js';
import { recordOutboxEvent } from '../infrastructure/prisma-outbox-writer.js';
import { OutboxWorker, type OutboxWorkerOptions } from './outbox-worker.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('OutboxWorker (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaOutboxRepository(prisma);
  const eventEmitter = new EventEmitter2();
  const operationPrefix = `outbox-worker-${process.pid}-${Date.now()}`;
  const eventName = durableEventName('test.worker', 1);
  const options: OutboxWorkerOptions = {
    enabled: true,
    batchSize: 10,
    leaseMs: 5000,
    maxAttempts: 2,
    baseBackoffMs: 1,
    maxBackoffMs: 1,
  };

  const createEvent = async (suffix: string) => {
    const event = buildDurableEvent({
      type: 'test.worker',
      schemaVersion: 1,
      aggregateType: 'test',
      aggregateId: suffix,
      operationId: `${operationPrefix}-${suffix}`,
      clinicId: null,
      occurredAt: new Date(Date.now() - 100),
      payload: { id: suffix },
    });
    await prisma.$transaction((tx) => recordOutboxEvent(tx, event));
    return event;
  };

  beforeAll(async () => {
    await prisma.$connect();
    // Elimina únicamente fixtures abandonados por ejecuciones de integración
    // interrumpidas; nunca toca eventos de negocio.
    await prisma.outboxEvents.deleteMany({
      where: { type: { startsWith: 'test.' } },
    });
  });

  afterEach(async () => {
    eventEmitter.removeAllListeners();
    await prisma.outboxEvents.deleteMany({
      where: { operationId: { startsWith: operationPrefix } },
    });
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('publica después de que el handler termina correctamente', async () => {
    const event = await createEvent('success');
    const received: string[] = [];
    eventEmitter.on(eventName, (envelope: DurableDomainEvent) =>
      received.push(envelope.eventId),
    );
    const worker = new OutboxWorker(repository, eventEmitter, options);

    await expect(worker.processBatch()).resolves.toBe(1);

    expect(received).toEqual([event.eventId]);
    const persisted = await prisma.outboxEvents.findUniqueOrThrow({
      where: { eventId: event.eventId },
    });
    expect(persisted.publishedAt).not.toBeNull();
    expect(persisted.lockedBy).toBeNull();
  });

  it('reentrega después de un fallo y publica al completar el segundo intento', async () => {
    const event = await createEvent('redelivery');
    let deliveries = 0;
    eventEmitter.on(eventName, () => {
      deliveries += 1;
      if (deliveries === 1) throw new Error('temporary failure');
    });
    const worker = new OutboxWorker(repository, eventEmitter, options);

    await worker.processBatch();
    await worker.processBatch(new Date(Date.now() + 10));

    expect(deliveries).toBe(2);
    const persisted = await prisma.outboxEvents.findUniqueOrThrow({
      where: { eventId: event.eventId },
    });
    expect(persisted.attempts).toBe(2);
    expect(persisted.publishedAt).not.toBeNull();
  });

  it('no publica un tipo sin handler y conserva el error para reintento', async () => {
    const event = await createEvent('unknown');
    const worker = new OutboxWorker(repository, eventEmitter, options);

    await worker.processBatch();

    const persisted = await prisma.outboxEvents.findUniqueOrThrow({
      where: { eventId: event.eventId },
    });
    expect(persisted.publishedAt).toBeNull();
    expect(persisted.deadLetteredAt).toBeNull();
    expect(persisted.lastError).toContain('UnknownDurableEventError');
  });

  it('marca dead letter al agotar intentos sin borrar el evento', async () => {
    const event = await createEvent('dead-letter');
    eventEmitter.on(eventName, () => {
      throw new Error('patient@example.test token=super-secret');
    });
    const worker = new OutboxWorker(repository, eventEmitter, options);

    await worker.processBatch();
    await worker.processBatch(new Date(Date.now() + 10));

    const persisted = await prisma.outboxEvents.findUniqueOrThrow({
      where: { eventId: event.eventId },
    });
    expect(persisted.publishedAt).toBeNull();
    expect(persisted.deadLetteredAt).not.toBeNull();
    expect(persisted.lastError).not.toContain('patient@example.test');
    expect(persisted.lastError).not.toContain('super-secret');
  });
});
