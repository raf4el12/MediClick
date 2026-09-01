import { randomUUID } from 'node:crypto';

export type DurableEventPayload = Record<string, unknown>;

export interface DurableDomainEvent<
  Payload extends DurableEventPayload = DurableEventPayload,
> {
  eventId: string;
  type: string;
  schemaVersion: number;
  aggregateType: string;
  aggregateId: string;
  operationId: string;
  clinicId: number | null;
  occurredAt: string;
  payload: Payload;
}

export type BuildDurableEventInput<
  Payload extends DurableEventPayload = DurableEventPayload,
> = Omit<DurableDomainEvent<Payload>, 'eventId' | 'occurredAt'> & {
  eventId?: string;
  occurredAt?: Date | string;
};

export function outboxDedupeKey(
  event: Pick<
    DurableDomainEvent,
    'type' | 'schemaVersion' | 'aggregateType' | 'aggregateId' | 'operationId'
  >,
): string {
  return `${event.type}:v${event.schemaVersion}:${event.aggregateType}:${event.aggregateId}:${event.operationId}`;
}

export function buildDurableEvent<Payload extends DurableEventPayload>(
  input: BuildDurableEventInput<Payload>,
): DurableDomainEvent<Payload> {
  const occurredAt = input.occurredAt ?? new Date();

  return {
    eventId: input.eventId ?? randomUUID(),
    type: input.type,
    schemaVersion: input.schemaVersion,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    operationId: input.operationId,
    clinicId: input.clinicId,
    occurredAt:
      occurredAt instanceof Date ? occurredAt.toISOString() : occurredAt,
    payload: input.payload,
  };
}

export function durableEventName(type: string, schemaVersion: number): string {
  return `outbox.${type}.v${schemaVersion}`;
}
