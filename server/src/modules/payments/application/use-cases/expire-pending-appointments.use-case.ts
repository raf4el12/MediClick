import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class ExpirePendingAppointmentsUseCase {
  private readonly logger = new Logger(ExpirePendingAppointmentsUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async execute(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.appointments.updateMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        pendingUntil: { lt: now },
        deleted: false,
      },
      data: {
        status: 'CANCELLED',
        cancelReason: 'Pago no completado dentro del tiempo permitido',
        updatedAt: now,
      },
    });
    if (result.count > 0) {
      this.logger.log(
        `[AUDIT] Expiradas ${result.count} citas PENDING sin pago`,
      );
    }
  }
}
