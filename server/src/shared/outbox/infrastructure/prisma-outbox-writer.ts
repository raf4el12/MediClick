import { isDeepStrictEqual } from 'node:util';
import type { Prisma } from '@prisma/client';
import type { DurableDomainEvent } from '../domain/durable-domain-event.js';
import { outboxDedupeKey } from '../domain/durable-domain-event.js';

export class OutboxContractConflictError extends Error {
  constructor(dedupeKey: string) {
    super(`Conflicto de contrato para el evento durable ${dedupeKey}`);
    this.name = OutboxContractConflictError.name;
  }
}

export async function recordOutboxEvent(
  tx: Prisma.TransactionClient,
  event: DurableDomainEvent,
): Promise<void> {
  const dedupeKey = outboxDedupeKey(event);
  const result = await tx.outboxEvents.createMany({
    data: {
      eventId: event.eventId,
      type: event.type,
      schemaVersion: event.schemaVersion,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      operationId: event.operationId,
      clinicId: event.clinicId,
      payload: event.payload as Prisma.InputJsonValue,
      dedupeKey,
      occurredAt: new Date(event.occurredAt),
      availableAt: new Date(event.occurredAt),
    },
    skipDuplicates: true,
  });

  if (result.count === 1) return;

  const existing = await tx.outboxEvents.findUniqueOrThrow({
    where: { dedupeKey },
  });
  const existingEnvelope: DurableDomainEvent = {
    eventId: existing.eventId,
    type: existing.type,
    schemaVersion: existing.schemaVersion,
    aggregateType: existing.aggregateType,
    aggregateId: existing.aggregateId,
    operationId: existing.operationId,
    clinicId: existing.clinicId,
    occurredAt: existing.occurredAt.toISOString(),
    payload: existing.payload as DurableDomainEvent['payload'],
  };

  if (!isDeepStrictEqual(existingEnvelope, event)) {
    throw new OutboxContractConflictError(dedupeKey);
  }
}
