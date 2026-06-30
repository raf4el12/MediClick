import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import {
  SLOT_RELEASED_EVENT,
  type SlotReleasedEvent,
} from '../../../../shared/events/availability-events.interface.js';

@Injectable()
export class ExpirePendingAppointmentsUseCase {
  private readonly logger = new Logger(ExpirePendingAppointmentsUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async execute(): Promise<void> {
    const expired = await this.appointmentRepository.expirePendingPastDeadline(
      new Date(),
    );
    if (expired.length === 0) return;

    // Cada slot expirado queda libre: reofrecerlo a la lista de espera
    for (const slot of expired) {
      const event: SlotReleasedEvent = {
        appointmentId: slot.id,
        scheduleId: slot.scheduleId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        clinicId: slot.clinicId,
      };
      this.eventEmitter.emit(SLOT_RELEASED_EVENT, event);
    }

    this.logger.log(
      `[AUDIT] Expiradas ${expired.length} citas PENDING sin pago; slots reofrecidos a la waitlist`,
    );
  }
}
