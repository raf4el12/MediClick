import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  PATIENT_CREATED_EVENT,
  PATIENT_DELETED_EVENT,
  PATIENT_EVENT_SCHEMA_VERSION,
  PATIENT_UPDATED_EVENT,
  type PatientChangedPayload,
} from '../../../../shared/events/patient-events.interface.js';
import {
  durableEventName,
  type DurableDomainEvent,
} from '../../../../shared/outbox/domain/durable-domain-event.js';
import { toFhirPatient } from '../../domain/mappers/patient-fhir.mapper.js';
import { buildProvenance } from '../../domain/mappers/provenance-fhir.mapper.js';
import { fhirIdFor, provenanceIdFor } from '../../domain/fhir-id.logic.js';
import { FhirResourceService } from '../services/fhir-resource.service.js';

const CONSUMER_NAME = 'fhir-patient-projection';
type PatientDurableEvent = DurableDomainEvent<PatientChangedPayload>;

@Injectable()
export class PatientProjectionListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirResourceService: FhirResourceService,
  ) {}

  @OnEvent(
    durableEventName(PATIENT_CREATED_EVENT, PATIENT_EVENT_SCHEMA_VERSION),
    { async: true },
  )
  handleCreated(event: PatientDurableEvent): Promise<void> {
    return this.project(event);
  }

  @OnEvent(
    durableEventName(PATIENT_UPDATED_EVENT, PATIENT_EVENT_SCHEMA_VERSION),
    { async: true },
  )
  handleUpdated(event: PatientDurableEvent): Promise<void> {
    return this.project(event);
  }

  @OnEvent(
    durableEventName(PATIENT_DELETED_EVENT, PATIENT_EVENT_SCHEMA_VERSION),
    { async: true },
  )
  handleDeleted(event: PatientDurableEvent): Promise<void> {
    return this.project(event);
  }

  private async project(event: PatientDurableEvent): Promise<void> {
    const patientId = event.payload.patientId;
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      include: { profile: true },
    });
    if (!patient) {
      throw new Error(`Patient ${patientId} no encontrado para ${event.type}`);
    }

    const fhirId = fhirIdFor('Patient', patientId);
    const occurredAt = new Date(event.occurredAt);
    if (patient.deleted) {
      await this.fhirResourceService.applyProjection({
        consumerName: CONSUMER_NAME,
        eventId: event.eventId,
        occurredAt,
        upserts: [],
        deletes: [{ resourceType: 'Patient', id: fhirId }],
      });
      return;
    }

    await this.fhirResourceService.applyProjection({
      consumerName: CONSUMER_NAME,
      eventId: event.eventId,
      occurredAt,
      upserts: [
        {
          id: fhirId,
          resourceType: 'Patient',
          content: toFhirPatient(patient),
          clinicId: null,
        },
        {
          id: provenanceIdFor('Patient', patientId),
          resourceType: 'Provenance',
          content: buildProvenance({
            targetType: 'Patient',
            targetFhirId: fhirId,
            eventName: event.type,
            internalId: patientId,
            recordedAt: occurredAt,
          }),
          clinicId: null,
        },
      ],
    });
  }
}
