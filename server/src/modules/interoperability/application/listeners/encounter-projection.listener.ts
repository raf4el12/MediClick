import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { FhirResourceService } from '../services/fhir-resource.service.js';
import { toFhirEncounter } from '../../domain/mappers/encounter-fhir.mapper.js';
import { buildProvenance } from '../../domain/mappers/provenance-fhir.mapper.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

/** Solo se usa appointmentId; el resto del payload es de notificaciones. */
interface AppointmentEventPayload {
  appointmentId: number;
}

@Injectable()
export class EncounterProjectionListener {
  private readonly logger = new Logger(EncounterProjectionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirResourceService: FhirResourceService,
  ) {}

  @OnEvent('appointment.confirmed', { async: true })
  handleConfirmed(event: AppointmentEventPayload): Promise<void> {
    return this.project(event.appointmentId, 'appointment.confirmed');
  }

  @OnEvent('appointment.cancelled', { async: true })
  handleCancelled(event: AppointmentEventPayload): Promise<void> {
    return this.project(event.appointmentId, 'appointment.cancelled');
  }

  private async project(
    appointmentId: number,
    eventName: string,
  ): Promise<void> {
    try {
      const appointment = await this.prisma.appointments.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          status: true,
          startTime: true,
          endTime: true,
          patientId: true,
          clinicId: true,
        },
      });
      if (!appointment) {
        this.logger.warn(
          `[PROJECTION] Cita ${appointmentId} no encontrada; se omite (${eventName})`,
        );
        return;
      }

      const fhirId = fhirIdFor('Encounter', appointmentId);
      const clinicId = appointment.clinicId ?? null;
      await this.fhirResourceService.save({
        id: fhirId,
        resourceType: 'Encounter',
        content: toFhirEncounter(appointment),
        clinicId,
      });
      await this.fhirResourceService.save({
        id: provenanceIdFor('Encounter', appointmentId),
        resourceType: 'Provenance',
        content: buildProvenance({
          targetType: 'Encounter',
          targetFhirId: fhirId,
          eventName,
          internalId: appointmentId,
          recordedAt: new Date(),
        }),
        clinicId,
      });
    } catch (err) {
      this.logger.error(
        `[PROJECTION] Error proyectando Encounter ${appointmentId} (${eventName}): ${(err as Error).message}`,
      );
    }
  }
}
