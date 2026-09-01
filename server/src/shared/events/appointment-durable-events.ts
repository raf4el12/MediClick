import type { DurableDomainEvent } from '../outbox/domain/durable-domain-event.js';
import { buildDurableEvent } from '../outbox/domain/durable-domain-event.js';

export const APPOINTMENT_SLOT_RELEASED = 'appointment.slot_released';
export const APPOINTMENT_CONFIRMED = 'appointment.confirmed';
export const APPOINTMENT_CANCELLED = 'appointment.cancelled';
export const APPOINTMENT_EVENT_SCHEMA_VERSION = 1;

export interface AppointmentSlotReleasedPayload {
  appointmentId: number;
  scheduleId: number;
  startTime: string;
  endTime: string;
  [key: string]: unknown;
}

export interface AppointmentChangedPayload {
  appointmentId: number;
  [key: string]: unknown;
}

interface AppointmentEventIdentity {
  eventId: string;
  operationId: string;
  occurredAt: Date | string;
  appointmentId: number;
  clinicId: number | null;
}

export function buildAppointmentSlotReleasedDurableEvent(
  input: AppointmentEventIdentity & {
    scheduleId: number;
    startTime: Date;
    endTime: Date;
  },
): DurableDomainEvent<AppointmentSlotReleasedPayload> {
  return buildDurableEvent({
    eventId: input.eventId,
    type: APPOINTMENT_SLOT_RELEASED,
    schemaVersion: APPOINTMENT_EVENT_SCHEMA_VERSION,
    aggregateType: 'appointment',
    aggregateId: String(input.appointmentId),
    operationId: input.operationId,
    clinicId: input.clinicId,
    occurredAt: input.occurredAt,
    payload: {
      appointmentId: input.appointmentId,
      scheduleId: input.scheduleId,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
    },
  });
}

export function buildAppointmentChangedDurableEvent(
  type: typeof APPOINTMENT_CONFIRMED | typeof APPOINTMENT_CANCELLED,
  input: AppointmentEventIdentity,
): DurableDomainEvent<AppointmentChangedPayload> {
  return buildDurableEvent({
    eventId: input.eventId,
    type,
    schemaVersion: APPOINTMENT_EVENT_SCHEMA_VERSION,
    aggregateType: 'appointment',
    aggregateId: String(input.appointmentId),
    operationId: input.operationId,
    clinicId: input.clinicId,
    occurredAt: input.occurredAt,
    payload: { appointmentId: input.appointmentId },
  });
}
