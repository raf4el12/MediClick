import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import {
  ReminderTokenService,
  ReminderAction,
} from '../services/reminder-token.service.js';
import { AppointmentCancellationService } from '../services/appointment-cancellation.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

export interface ReminderResponseResult {
  appointmentId: number;
  action: ReminderAction;
  status: AppointmentStatus;
  alreadyConfirmed?: boolean;
  alreadyCancelled?: boolean;
  message: string;
}

@Injectable()
export class RespondAppointmentReminderUseCase {
  private readonly logger = new Logger(RespondAppointmentReminderUseCase.name);

  constructor(
    private readonly reminderTokenService: ReminderTokenService,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly appointmentCancellationService: AppointmentCancellationService,
  ) {}

  async execute(token: string): Promise<ReminderResponseResult> {
    const payload = this.reminderTokenService.verifyToken(token);
    const { appointmentId, action } = payload;

    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    if (!appointment || appointment.deleted) {
      throw new NotFoundException('La cita indicada no existe o fue eliminada');
    }

    if (action === ReminderAction.CONFIRM) {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new ConflictException(
          'No se puede confirmar asistencia: la cita ya fue cancelada previamente',
        );
      }
      if (appointment.status === AppointmentStatus.COMPLETED) {
        throw new ConflictException('La cita ya fue completada');
      }
      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        throw new ConflictException(
          `Solo citas con cupo confirmado pueden registrar confirmación de asistencia (estado actual: ${appointment.status})`,
        );
      }

      if (
        appointment.confirmedAt !== null &&
        appointment.confirmedAt !== undefined
      ) {
        return {
          appointmentId,
          action: ReminderAction.CONFIRM,
          status: AppointmentStatus.CONFIRMED,
          alreadyConfirmed: true,
          message:
            'Tu asistencia a esta cita ya había sido confirmada previamente.',
        };
      }

      const now = new Date();
      await this.appointmentRepository.update(appointmentId, {
        confirmedAt: now,
        isAtRisk: false,
      });

      this.logger.log(
        `[REMINDER] Cita ${appointmentId} confirmada en 1-click por el paciente a las ${now.toISOString()}`,
      );

      return {
        appointmentId,
        action: ReminderAction.CONFIRM,
        status: AppointmentStatus.CONFIRMED,
        alreadyConfirmed: false,
        message: '¡Gracias! Tu asistencia ha sido confirmada exitosamente.',
      };
    }

    if (action === ReminderAction.CANCEL) {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        return {
          appointmentId,
          action: ReminderAction.CANCEL,
          status: AppointmentStatus.CANCELLED,
          alreadyCancelled: true,
          message: 'La cita ya se encontraba cancelada.',
        };
      }

      await this.appointmentCancellationService.cancel({
        appointmentId,
        reason: 'Cancelado por el paciente desde recordatorio interactivo',
        cancelledBy: 'PATIENT_REMINDER',
      });

      this.logger.log(
        `[REMINDER] Cita ${appointmentId} cancelada en 1-click por el paciente. Cupo liberado hacia waitlist.`,
      );

      return {
        appointmentId,
        action: ReminderAction.CANCEL,
        status: AppointmentStatus.CANCELLED,
        alreadyCancelled: false,
        message:
          'Tu cita ha sido cancelada exitosamente y el cupo ha sido liberado.',
      };
    }

    throw new ConflictException(`Acción no soportada: ${String(action)}`);
  }
}
