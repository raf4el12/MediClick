import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { TransactionEntity } from '../../../payments/domain/entities/transaction.entity.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { SLOT_RELEASED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import {
  buildAppointmentCancelledEvent,
  buildSlotReleasedEvent,
} from './appointment-event.builder.js';

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
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly timezoneResolver: TimezoneResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async cancel(
    input: AppointmentCancellationInput,
  ): Promise<AppointmentWithRelations> {
    const updated = await this.appointmentRepository.update(
      input.appointmentId,
      {
        status: AppointmentStatus.CANCELLED,
        cancelReason: input.reason,
        ...(input.cancellationFee !== undefined && {
          cancellationFee: input.cancellationFee,
        }),
        updatedAt: new Date(),
      },
    );

    const tx = await this.transactionRepository.findLatestByAppointmentId(
      updated.id,
    );
    if (tx?.status === 'PAID') {
      await this.flagTransactionForManualRefund(tx, input);
    }

    const clinicId = await this.timezoneResolver.resolveClinicIdByDoctorId(
      updated.schedule.doctor.id,
    );
    this.eventEmitter.emit(
      SLOT_RELEASED_EVENT,
      buildSlotReleasedEvent(updated, clinicId),
    );

    const cancelledEvent = buildAppointmentCancelledEvent(
      updated,
      input.reason,
      clinicId,
    );
    if (cancelledEvent) {
      this.eventEmitter.emit('appointment.cancelled', cancelledEvent);
    }

    return updated;
  }

  private async flagTransactionForManualRefund(
    tx: TransactionEntity,
    input: AppointmentCancellationInput,
  ): Promise<void> {
    const previousMetadata =
      tx.metadata && typeof tx.metadata === 'object'
        ? (tx.metadata as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();

    await this.transactionRepository.update(tx.id, {
      metadata: {
        ...previousMetadata,
        needsRefund: true,
        refundRequestedAt: now,
        refundCancelReason: input.reason,
        refundCancelledBy: input.cancelledBy,
        ...(input.cancellationFee !== undefined && {
          needsFeeCollection: true,
          feeAmount: input.cancellationFee,
          feeReason: 'Cancelación tardía (<24h)',
          feeRequestedAt: now,
        }),
      },
    });

    this.logger.warn(
      `[REVIEW] Cita ${input.appointmentId} cancelada con pago PAID (txId=${tx.id})` +
        (input.cancellationFee !== undefined
          ? `; fee S/${input.cancellationFee} por cobrar`
          : '') +
        '. Refund manual pendiente.',
    );
  }
}
