import { randomUUID } from 'node:crypto';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { buildAppointmentCancelledEvent } from './appointment-event.builder.js';

export interface AppointmentCancellationInput {
  appointmentId: number;
  reason: string | null;
  cancelledBy: string;
  cancellationFee?: number;
}

/**
 * Efectos comunes de una cancelación ya autorizada: estado asistencial,
 * revisión financiera manual y publicaciones para notificación/waitlist.
 */
@Injectable()
export class AppointmentCancellationService {
  private readonly logger = new Logger(AppointmentCancellationService.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async cancel(
    input: AppointmentCancellationInput,
  ): Promise<AppointmentWithRelations> {
    const occurredAt = new Date();
    const result = await this.appointmentRepository.cancelAtomically({
      ...input,
      eventIdentity: {
        operationId: randomUUID(),
        cancelledEventId: randomUUID(),
        slotReleasedEventId: randomUUID(),
        occurredAt,
      },
    });
    const updated = result.appointment;
    const clinicId =
      updated.clinicId ?? updated.schedule.doctor.clinic?.id ?? null;

    if (result.refundReviewTransactionId !== null) {
      this.logger.warn(
        `[REVIEW] Cita ${input.appointmentId} cancelada con pago PAID ` +
          `(txId=${result.refundReviewTransactionId}). Refund manual pendiente.`,
      );
    }

    if (result.transitioned) {
      const cancelledEvent = buildAppointmentCancelledEvent(
        updated,
        input.reason,
        clinicId,
      );
      if (cancelledEvent) {
        this.eventEmitter.emit('appointment.cancelled', cancelledEvent);
      }
    }

    return updated;
  }
}
