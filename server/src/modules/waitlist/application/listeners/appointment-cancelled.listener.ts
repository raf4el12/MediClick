import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AppointmentCancelledEvent } from '../../../../shared/mail/events/mail-events.interface.js';
import { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';

/**
 * Cuando se cancela una cita, el slot queda libre: disparamos el matcher de la
 * lista de espera para ofrecérselo al primer paciente en cola.
 */
@Injectable()
export class AppointmentCancelledListener {
  private readonly logger = new Logger(AppointmentCancelledListener.name);

  constructor(private readonly findNextMatch: FindNextMatchUseCase) {}

  @OnEvent('appointment.cancelled', { async: true })
  async handle(event: AppointmentCancelledEvent): Promise<void> {
    try {
      await this.findNextMatch.execute({
        scheduleId: event.scheduleId,
        startTime: event.startTime,
        endTime: event.endTime,
        clinicId: event.clinicId,
      });
    } catch (error) {
      this.logger.error(
        `[WAITLIST] Error procesando appointment.cancelled (id=${event.appointmentId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
