import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SLOT_RELEASED_EVENT,
  type SlotReleasedEvent,
} from '../../../../shared/events/availability-events.interface.js';
import { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';

/**
 * Cuando un slot queda libre (cancelación, reagendamiento o expiración de
 * pago), disparamos el matcher de la lista de espera para ofrecérselo al
 * primer paciente en cola.
 */
@Injectable()
export class SlotReleasedListener {
  private readonly logger = new Logger(SlotReleasedListener.name);

  constructor(private readonly findNextMatch: FindNextMatchUseCase) {}

  @OnEvent(SLOT_RELEASED_EVENT, { async: true })
  async handle(event: SlotReleasedEvent): Promise<void> {
    try {
      await this.findNextMatch.execute({
        scheduleId: event.scheduleId,
        startTime: event.startTime,
        endTime: event.endTime,
        clinicId: event.clinicId,
      });
    } catch (error) {
      this.logger.error(
        `[WAITLIST] Error procesando slot liberado (appointmentId=${event.appointmentId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
