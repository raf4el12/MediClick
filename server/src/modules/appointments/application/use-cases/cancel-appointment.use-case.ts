import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import {
  MIN_CANCELLATION_HOURS_PATIENT,
  CANCELLATION_FEE_PERCENTAGE,
} from '../../domain/constants/cancellation-policy.constants.js';
import {
  dateToTimeString,
  nowInTimezone,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { SLOT_RELEASED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import {
  buildAppointmentCancelledEvent,
  buildSlotReleasedEvent,
} from '../services/appointment-event.builder.js';
import type { TransactionEntity } from '../../../payments/domain/entities/transaction.entity.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class CancelAppointmentUseCase {
  private readonly logger = new Logger(CancelAppointmentUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly timezoneResolver: TimezoneResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: number,
    dto: CancelAppointmentDto,
    userRole: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    const forbiddenStatuses = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
    ];
    if (forbiddenStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `No se puede cancelar. Estado actual: ${appointment.status}`,
      );
    }

    // Calcular horas restantes hasta la cita (zona horaria de la sede del doctor)
    const tz = await this.timezoneResolver.resolveByDoctorId(
      appointment.schedule.doctor.id,
    );
    const now = nowInTimezone(tz);
    const scheduleDate = new Date(appointment.schedule.scheduleDate);
    const appointmentDateTime = new Date(
      scheduleDate.getUTCFullYear(),
      scheduleDate.getUTCMonth(),
      scheduleDate.getUTCDate(),
      appointment.startTime.getUTCHours(),
      appointment.startTime.getUTCMinutes(),
    );
    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Buscar la última transacción una sola vez: el fee solo aplica si hay un
    // pago PAID que cobrar, y los flags de refund/fee se anclan en esa transacción.
    const tx = await this.transactionRepository.findLatestByAppointmentId(id);
    const isPaid = tx?.status === 'PAID';

    let cancellationFee: number | undefined;

    // Penalización: paciente que cancela tarde (<24h) una cita pagada.
    if (
      userRole === UserRole.PATIENT &&
      hoursUntilAppointment < MIN_CANCELLATION_HOURS_PATIENT &&
      isPaid
    ) {
      const specialty = await this.specialtyRepository.findById(
        appointment.schedule.specialty.id,
      );
      const specialtyPrice = specialty?.price ?? 0;
      if (specialtyPrice > 0) {
        cancellationFee = Math.round(
          (specialtyPrice * CANCELLATION_FEE_PERCENTAGE) / 100,
        );
      }
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.CANCELLED,
      cancelReason: dto.reason,
      ...(cancellationFee !== undefined && { cancellationFee }),
      updatedAt: new Date(),
    });

    // Una cita pagada que se cancela requiere refund manual; si además hubo
    // penalización por cancelación tardía, se marca el cobro del fee en la misma
    // transacción para que el admin reconcilie el neto. Sin gateway automático.
    if (isPaid && tx) {
      await this.flagTransactionOnCancel(
        id,
        tx,
        dto.reason,
        userRole,
        cancellationFee,
      );
    }

    const clinicId = await this.timezoneResolver.resolveClinicIdByDoctorId(
      updated.schedule.doctor.id,
    );

    // El slot liberado se reofrece SIEMPRE a la waitlist, tenga o no usuario
    // el paciente. Mail/notificación sí requieren usuario (builder retorna null).
    this.eventEmitter.emit(
      SLOT_RELEASED_EVENT,
      buildSlotReleasedEvent(updated, clinicId),
    );

    const cancelledEvent = buildAppointmentCancelledEvent(
      updated,
      dto.reason ?? null,
      clinicId,
    );
    if (cancelledEvent) {
      this.eventEmitter.emit('appointment.cancelled', cancelledEvent);
    }

    return this.toResponse(updated);
  }

  /**
   * Marca la transacción PAID de una cita cancelada para revisión manual del
   * admin: siempre `needsRefund`, y además `needsFeeCollection` cuando hubo
   * penalización por cancelación tardía. Una sola escritura de metadata; sin
   * refunds ni cobros automáticos vía gateway (quedan para fase posterior).
   */
  private async flagTransactionOnCancel(
    appointmentId: number,
    tx: TransactionEntity,
    cancelReason: string | undefined,
    cancelledBy: string,
    cancellationFee: number | undefined,
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
        refundCancelReason: cancelReason ?? null,
        refundCancelledBy: cancelledBy,
        ...(cancellationFee !== undefined && {
          needsFeeCollection: true,
          feeAmount: cancellationFee,
          feeReason: 'Cancelación tardía (<24h)',
          feeRequestedAt: now,
        }),
      },
    });

    this.logger.warn(
      `[REVIEW] Cita ${appointmentId} cancelada con pago PAID (txId=${tx.id})` +
        (cancellationFee !== undefined
          ? `; fee S/${cancellationFee} por cobrar`
          : '') +
        '. Refund manual pendiente.',
    );
  }

  private toResponse(a: any): AppointmentResponseDto {
    return {
      id: a.id,
      patientId: a.patientId,
      scheduleId: a.scheduleId,
      startTime: dateToTimeString(a.startTime),
      endTime: dateToTimeString(a.endTime),
      reason: a.reason,
      notes: a.notes,
      status: a.status,
      paymentStatus: a.paymentStatus,
      amount: a.amount,
      cancelReason: a.cancelReason,
      cancellationFee: a.cancellationFee,
      isOverbook: a.isOverbook,
      pendingUntil: a.pendingUntil ?? null,
      patient: {
        id: a.patient.id,
        name: a.patient.profile.name,
        lastName: a.patient.profile.lastName,
        email: a.patient.profile.email,
      },
      schedule: {
        id: a.schedule.id,
        scheduleDate: a.schedule.scheduleDate,
        timeFrom: dateToTimeString(a.schedule.timeFrom),
        timeTo: dateToTimeString(a.schedule.timeTo),
        doctor: {
          id: a.schedule.doctor.id,
          name: a.schedule.doctor.profile.name,
          lastName: a.schedule.doctor.profile.lastName,
        },
        specialty: a.schedule.specialty,
      },
      timezone: a.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
      hasPrescription: a.hasPrescription,
      notesCount: a.notesCount,
      createdAt: a.createdAt,
    };
  }
}
