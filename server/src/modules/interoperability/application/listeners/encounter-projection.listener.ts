import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  APPOINTMENT_CANCELLED,
  APPOINTMENT_CONFIRMED,
  APPOINTMENT_EVENT_SCHEMA_VERSION,
  type AppointmentChangedPayload,
} from '../../../../shared/events/appointment-durable-events.js';
import {
  durableEventName,
  type DurableDomainEvent,
} from '../../../../shared/outbox/domain/durable-domain-event.js';
import { toFhirEncounter } from '../../domain/mappers/encounter-fhir.mapper.js';
import { buildProvenance } from '../../domain/mappers/provenance-fhir.mapper.js';
import { fhirIdFor, provenanceIdFor } from '../../domain/fhir-id.logic.js';
import { FhirResourceService } from '../services/fhir-resource.service.js';

const CONSUMER_NAME = 'fhir-encounter-projection';
type AppointmentDurableEvent = DurableDomainEvent<AppointmentChangedPayload>;

@Injectable()
export class EncounterProjectionListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirResourceService: FhirResourceService,
  ) {}

  @OnEvent(
    durableEventName(APPOINTMENT_CONFIRMED, APPOINTMENT_EVENT_SCHEMA_VERSION),
    { async: true },
  )
  handleConfirmed(event: AppointmentDurableEvent): Promise<void> {
    return this.project(event);
  }

  @OnEvent(
    durableEventName(APPOINTMENT_CANCELLED, APPOINTMENT_EVENT_SCHEMA_VERSION),
    { async: true },
  )
  handleCancelled(event: AppointmentDurableEvent): Promise<void> {
    return this.project(event);
  }

  private async project(event: AppointmentDurableEvent): Promise<void> {
    const appointmentId = event.payload.appointmentId;
    const appointment = event.clinicId
      ? await this.prisma.appointments.findFirst({
          where: {
            id: appointmentId,
            deleted: false,
            OR: [
              { clinicId: event.clinicId },
              { schedule: { clinicId: event.clinicId } },
              { schedule: { doctor: { clinicId: event.clinicId } } },
            ],
          },
          select: appointmentProjectionSelect,
        })
      : await this.prisma.appointments.findUnique({
          where: { id: appointmentId },
          select: appointmentProjectionSelect,
        });

    if (!appointment || appointment.deleted) {
      throw new Error(
        `Cita ${appointmentId} no encontrada en el alcance del evento ${event.eventId}`,
      );
    }

    const persistedClinicId =
      appointment.clinicId ??
      appointment.schedule.clinicId ??
      appointment.schedule.doctor.clinicId ??
      null;
    if (event.clinicId !== persistedClinicId) {
      throw new Error(
        `clinicId inconsistente para cita ${appointmentId}: evento=${String(event.clinicId)}, persistido=${String(persistedClinicId)}`,
      );
    }

    const fhirId = fhirIdFor('Encounter', appointmentId);
    const occurredAt = new Date(event.occurredAt);
    await this.fhirResourceService.applyProjection({
      consumerName: CONSUMER_NAME,
      eventId: event.eventId,
      occurredAt,
      upserts: [
        {
          id: fhirId,
          resourceType: 'Encounter',
          content: toFhirEncounter(appointment),
          clinicId: persistedClinicId,
        },
        {
          id: provenanceIdFor('Encounter', appointmentId),
          resourceType: 'Provenance',
          content: buildProvenance({
            targetType: 'Encounter',
            targetFhirId: fhirId,
            eventName: event.type,
            internalId: appointmentId,
            recordedAt: occurredAt,
          }),
          clinicId: persistedClinicId,
        },
      ],
    });
  }
}

const appointmentProjectionSelect = {
  id: true,
  status: true,
  startTime: true,
  endTime: true,
  patientId: true,
  clinicId: true,
  deleted: true,
  schedule: {
    select: {
      clinicId: true,
      doctor: { select: { clinicId: true } },
    },
  },
} as const;
