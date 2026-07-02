import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  PATIENT_CREATED_EVENT,
  PATIENT_UPDATED_EVENT,
  PATIENT_DELETED_EVENT,
  type PatientChangedEvent,
} from '../../../../shared/events/patient-events.interface.js';
import { FhirResourceService } from '../services/fhir-resource.service.js';
import { toFhirPatient } from '../../domain/mappers/patient-fhir.mapper.js';
import { buildProvenance } from '../../domain/mappers/provenance-fhir.mapper.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

@Injectable()
export class PatientProjectionListener {
  private readonly logger = new Logger(PatientProjectionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirResourceService: FhirResourceService,
  ) {}

  @OnEvent(PATIENT_CREATED_EVENT, { async: true })
  handleCreated(event: PatientChangedEvent): Promise<void> {
    return this.project(event.patientId, PATIENT_CREATED_EVENT);
  }

  @OnEvent(PATIENT_UPDATED_EVENT, { async: true })
  handleUpdated(event: PatientChangedEvent): Promise<void> {
    return this.project(event.patientId, PATIENT_UPDATED_EVENT);
  }

  @OnEvent(PATIENT_DELETED_EVENT, { async: true })
  async handleDeleted(event: PatientChangedEvent): Promise<void> {
    try {
      await this.fhirResourceService.softDelete(
        'Patient',
        fhirIdFor('Patient', event.patientId),
      );
    } catch (err) {
      this.logger.error(
        `[PROJECTION] Error al soft-borrar Patient ${event.patientId}: ${(err as Error).message}`,
      );
    }
  }

  private async project(patientId: number, eventName: string): Promise<void> {
    try {
      const patient = await this.prisma.patients.findUnique({
        where: { id: patientId },
        include: { profile: true },
      });
      if (!patient) {
        this.logger.warn(
          `[PROJECTION] Patient ${patientId} no encontrado; se omite (${eventName})`,
        );
        return;
      }

      const fhirId = fhirIdFor('Patient', patientId);
      await this.fhirResourceService.save({
        id: fhirId,
        resourceType: 'Patient',
        content: toFhirPatient(patient),
        clinicId: null,
      });
      await this.fhirResourceService.save({
        id: provenanceIdFor('Patient', patientId),
        resourceType: 'Provenance',
        content: buildProvenance({
          targetType: 'Patient',
          targetFhirId: fhirId,
          eventName,
          internalId: patientId,
          recordedAt: new Date(),
        }),
        clinicId: null,
      });
    } catch (err) {
      this.logger.error(
        `[PROJECTION] Error proyectando Patient ${patientId} (${eventName}): ${(err as Error).message}`,
      );
    }
  }
}
