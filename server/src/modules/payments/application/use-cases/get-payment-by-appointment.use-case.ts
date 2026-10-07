import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import { PaymentResponseDto } from '../dto/payment-response.dto.js';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import {
  authorizeAppointmentPaymentRead,
  toPaymentResponse,
} from '../appointment-payment-read.js';

@Injectable()
export class GetPaymentByAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
    private readonly appointmentAccessPolicy: AppointmentAccessPolicy,
  ) {}

  async execute(
    actor: AuthenticatedUser,
    appointmentId: number,
    paymentId?: string,
  ): Promise<PaymentResponseDto> {
    await authorizeAppointmentPaymentRead(
      this.prisma,
      this.appointmentAccessPolicy,
      actor,
      appointmentId,
    );

    let transaction =
      await this.transactionRepository.findLatestByAppointmentId(appointmentId);

    if (!transaction) {
      throw new NotFoundException('No hay pagos registrados para esta cita');
    }

    if (transaction.status === 'PENDING' && paymentId) {
      await this.handlePaymentWebhookUseCase.execute({
        type: 'payment',
        data: { id: paymentId },
      });
      // Re-fetch transaction to get updated status
      transaction =
        await this.transactionRepository.findLatestByAppointmentId(
          appointmentId,
        );
      if (!transaction) {
        throw new NotFoundException('No hay pagos registrados para esta cita');
      }
    }

    return toPaymentResponse(transaction);
  }
}
