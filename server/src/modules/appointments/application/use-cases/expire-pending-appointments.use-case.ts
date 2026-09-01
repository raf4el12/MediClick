import { randomUUID } from 'node:crypto';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';

@Injectable()
export class ExpirePendingAppointmentsUseCase {
  private readonly logger = new Logger(ExpirePendingAppointmentsUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async execute(): Promise<void> {
    const now = new Date();
    const expired = await this.appointmentRepository.expirePendingPastDeadline(
      now,
      { operationId: randomUUID(), occurredAt: now },
    );
    if (expired.length === 0) return;

    this.logger.log(
      `[AUDIT] Expiradas ${expired.length} citas PENDING sin pago; liberaciones registradas en outbox`,
    );
  }
}
