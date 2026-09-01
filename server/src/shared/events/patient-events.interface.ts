import type { DurableDomainEvent } from '../outbox/domain/durable-domain-event.js';
import { buildDurableEvent } from '../outbox/domain/durable-domain-event.js';

export const PATIENT_CREATED_EVENT = 'patient.created';
export const PATIENT_UPDATED_EVENT = 'patient.updated';
export const PATIENT_DELETED_EVENT = 'patient.deleted';

/** Evento delgado: los listeners de proyección re-leen la entidad por id. */
export interface PatientChangedEvent {
  patientId: number;
}

export const PATIENT_EVENT_SCHEMA_VERSION = 1;

export interface PatientChangedPayload {
  patientId: number;
  [key: string]: unknown;
}

export function buildPatientChangedDurableEvent(input: {
  eventId: string;
  type:
    | typeof PATIENT_CREATED_EVENT
    | typeof PATIENT_UPDATED_EVENT
    | typeof PATIENT_DELETED_EVENT;
  operationId: string;
  occurredAt: Date | string;
  patientId: number;
}): DurableDomainEvent<PatientChangedPayload> {
  return buildDurableEvent({
    eventId: input.eventId,
    type: input.type,
    schemaVersion: PATIENT_EVENT_SCHEMA_VERSION,
    aggregateType: 'patient',
    aggregateId: String(input.patientId),
    operationId: input.operationId,
    clinicId: null,
    occurredAt: input.occurredAt,
    payload: { patientId: input.patientId },
  });
}
