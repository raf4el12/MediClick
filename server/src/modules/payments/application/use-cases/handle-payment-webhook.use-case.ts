import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import type {
  GatewayPaymentStatus,
  IPaymentGatewayService,
} from '../../domain/services/payment-gateway.service.js';
import type {
  PaymentMethodValue,
  PaymentStatusValue,
} from '../../domain/entities/transaction.entity.js';
import { WebhookPayloadDto } from '../dto/webhook-payload.dto.js';
import type { IPaymentReconciliationRepository } from '../../domain/repositories/payment-reconciliation.repository.js';

@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    @Inject('IPaymentReconciliationRepository')
    private readonly reconciliationRepository: IPaymentReconciliationRepository,
    @Inject('IPaymentGatewayService')
    private readonly gateway: IPaymentGatewayService,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(payload: WebhookPayloadDto): Promise<void> {
    const paymentId = payload?.data?.id;
    if (!paymentId) {
      this.logger.warn('Webhook recibido sin data.id — se ignora');
      return;
    }

    if (payload.type && payload.type !== 'payment') {
      this.logger.debug(
        `Webhook tipo=${payload.type} ignorado (solo procesamos type=payment)`,
      );
      return;
    }

    const gatewayStatus = await this.gateway.getPayment(paymentId);

    const externalRef = gatewayStatus.externalReference;
    if (!externalRef) {
      this.logger.warn(
        `Pago ${paymentId} sin external_reference — no se puede asociar a una cita`,
      );
      return;
    }
    const appointmentId = Number(externalRef);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      this.logger.warn(
        `external_reference=${externalRef} no es un appointmentId válido`,
      );
      return;
    }

    const status = this.mapStatus(gatewayStatus.status);
    const paymentMethod = this.mapPaymentMethod(gatewayStatus.paymentMethod);
    const result = await this.reconciliationRepository.reconcile({
      appointmentId,
      gatewayId: gatewayStatus.gatewayPaymentId,
      externalRef,
      amount: gatewayStatus.amount,
      currency: gatewayStatus.currency,
      status,
      paymentMethod,
      payerEmail: gatewayStatus.payerEmail,
      failureReason: status === 'FAILED' ? gatewayStatus.statusDetail : null,
      paidAt: status === 'PAID' ? gatewayStatus.approvedAt : null,
      raw: gatewayStatus.raw,
    });
    if (!result) {
      this.logger.warn(
        `Pago ${paymentId} refiere a appointmentId=${appointmentId} que no existe`,
      );
      return;
    }

    if (result.financialReviewRequired) {
      this.logger.warn(
        `[REVIEW] Pago aprobado para cita ${appointmentId} que ya estaba CANCELLED. Revisar manualmente.`,
      );
    }

    if (result.notificationUserId) {
      await this.createNotificationUseCase.execute({
        userId: result.notificationUserId,
        type: 'APPOINTMENT_CONFIRMED',
        channel: 'IN_APP',
        title: 'Pago confirmado',
        message: `Tu cita #${appointmentId} fue pagada y confirmada exitosamente.`,
        metadata: {
          appointmentId,
          paymentId: gatewayStatus.gatewayPaymentId,
        },
        clinicId: result.clinicId,
      });
    }

    this.logger.log(
      `[AUDIT] Webhook procesado | paymentId=${paymentId} appointmentId=${appointmentId} status=${status}`,
    );
  }

  private mapStatus(
    mpStatus: GatewayPaymentStatus['status'],
  ): PaymentStatusValue {
    switch (mpStatus) {
      case 'approved':
      case 'authorized':
        return 'PAID';
      case 'rejected':
        return 'FAILED';
      case 'refunded':
      case 'charged_back':
        return 'REFUNDED';
      case 'cancelled':
        return 'CANCELLED';
      case 'pending':
      case 'in_process':
      default:
        return 'PENDING';
    }
  }

  private mapPaymentMethod(mpMethod: string | null): PaymentMethodValue | null {
    if (!mpMethod) return null;
    const m = mpMethod.toLowerCase();
    if (m.includes('debit') || m.includes('debito')) return 'DEBIT_CARD';
    if (
      m.includes('credit') ||
      m.includes('visa') ||
      m.includes('master') ||
      m.includes('amex')
    ) {
      return 'CREDIT_CARD';
    }
    if (
      m.includes('transfer') ||
      m.includes('bank') ||
      m.includes('pagoefectivo')
    ) {
      return 'TRANSFER';
    }
    return 'OTHER';
  }
}
