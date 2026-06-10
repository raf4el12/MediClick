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
        // Incluye FAILED: un pago rechazado deja la cita en PENDING/FAILED y, si el
        // paciente no reintenta antes de pendingUntil, debe expirar igual que un
        // PENDING/PENDING. Sin esto la cita ocupaba el slot indefinidamente.
        paymentStatus: { in: ['PENDING', 'FAILED'] },
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
