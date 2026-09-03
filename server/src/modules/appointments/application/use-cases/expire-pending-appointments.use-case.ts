import { randomUUID } from 'node:crypto';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';
import { logicalWindowId } from '../../../../shared/redis/job-window.js';

@Injectable()
export class ExpirePendingAppointmentsUseCase {
  private readonly logger = new Logger(ExpirePendingAppointmentsUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly jobLeaseService: JobLeaseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async execute(): Promise<void> {
    const now = new Date();
    await this.jobLeaseService.withLease(
      'expire-pending-appointments',
      logicalWindowId(now, 60_000),
      65,
      async () => {
        const expired =
          await this.appointmentRepository.expirePendingPastDeadline(now, {
            operationId: randomUUID(),
            occurredAt: now,
          });
        if (expired.length === 0) return;

        this.logger.log(
          `[AUDIT] Expiradas ${expired.length} citas PENDING sin pago; liberaciones registradas en outbox`,
        );
      },
    );
  }
}
