import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  APPOINTMENT_EVENT_SCHEMA_VERSION,
  APPOINTMENT_SLOT_RELEASED,
  type AppointmentSlotReleasedPayload,
} from '../../../../shared/events/appointment-durable-events.js';
import {
  durableEventName,
  type DurableDomainEvent,
} from '../../../../shared/outbox/domain/durable-domain-event.js';
import { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';

@Injectable()
export class SlotReleasedListener {
  constructor(private readonly findNextMatch: FindNextMatchUseCase) {}

  @OnEvent(
    durableEventName(
      APPOINTMENT_SLOT_RELEASED,
      APPOINTMENT_EVENT_SCHEMA_VERSION,
    ),
    { async: true },
  )
  async handle(
    event: DurableDomainEvent<AppointmentSlotReleasedPayload>,
  ): Promise<void> {
    const startTime = new Date(event.payload.startTime);
    const endTime = new Date(event.payload.endTime);
    if (
      !Number.isFinite(startTime.getTime()) ||
      !Number.isFinite(endTime.getTime())
    ) {
      throw new Error(`Fechas inválidas en evento ${event.eventId}`);
    }

    await this.findNextMatch.execute({
      scheduleId: event.payload.scheduleId,
      startTime,
      endTime,
      clinicId: event.clinicId,
    });
  }
}
