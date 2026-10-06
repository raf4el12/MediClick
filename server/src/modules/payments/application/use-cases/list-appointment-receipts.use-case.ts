import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import { PaymentResponseDto } from '../dto/payment-response.dto.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import {
  authorizeAppointmentPaymentRead,
  toPaymentResponse,
} from '../appointment-payment-read.js';

/**
 * Comprobantes de pago de una cita: cada transacción aprobada (PAID), en orden
 * de pago. Una cita con seña y saldo tiene dos; un reintento pendiente o un
 * pago rechazado no generan comprobante.
 */
@Injectable()
export class ListAppointmentReceiptsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly appointmentAccessPolicy: AppointmentAccessPolicy,
  ) {}

  async execute(
    actor: AuthenticatedUser,
    appointmentId: number,
  ): Promise<PaymentResponseDto[]> {
    await authorizeAppointmentPaymentRead(
      this.prisma,
      this.appointmentAccessPolicy,
      actor,
      appointmentId,
    );

    const transactions =
      await this.transactionRepository.findByAppointmentId(appointmentId);
    return transactions
      .filter((t) => t.status === 'PAID' && t.paidAt !== null)
      .sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime())
      .map(toPaymentResponse);
  }
}
