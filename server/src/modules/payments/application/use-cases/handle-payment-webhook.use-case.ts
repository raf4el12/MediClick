import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import type {
  GatewayPaymentStatus,
  IPaymentGatewayService,
} from '../../domain/services/payment-gateway.service.js';
import type {
  PaymentMethodValue,
  PaymentStatusValue,
} from '../../domain/entities/transaction.entity.js';
import { WebhookPayloadDto } from '../dto/webhook-payload.dto.js';

@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
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

    let gatewayStatus: GatewayPaymentStatus;
    try {
      gatewayStatus = await this.gateway.getPayment(paymentId);
    } catch (err) {
      this.logger.error(
        `No se pudo consultar el pago ${paymentId} en MP: ${(err as Error).message}`,
      );
      // Devolvemos sin lanzar para que MP no reintente indefinidamente ante un error transitorio suyo.
      return;
    }

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

    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            profile: { select: { userId: true, name: true, lastName: true } },
          },
        },
      },
    });
    if (!appointment) {
      this.logger.warn(
        `Pago ${paymentId} refiere a appointmentId=${appointmentId} que no existe`,
      );
      return;
    }

    const status = this.mapStatus(gatewayStatus.status);
    const paymentMethod = this.mapPaymentMethod(gatewayStatus.paymentMethod);

    const existing = await this.transactionRepository.findByGatewayId(
      gatewayStatus.gatewayPaymentId,
    );

    if (existing) {
      await this.transactionRepository.update(existing.id, {
        status,
        paymentMethod,
        payerEmail: gatewayStatus.payerEmail,
        failureReason:
          status === 'FAILED' ? gatewayStatus.statusDetail : null,
        paidAt: status === 'PAID' ? gatewayStatus.approvedAt : null,
        metadata: gatewayStatus.raw,
      });
    } else {
      // El webhook puede llegar antes que el callback que crea la Transaction local,
      // o la Transaction PENDING puede existir sin gatewayId todavía.
      const pending =
        await this.transactionRepository.findLatestByAppointmentId(
          appointmentId,
        );
      if (pending && pending.status === 'PENDING' && !pending.gatewayId) {
        await this.transactionRepository.update(pending.id, {
          status,
          paymentMethod,
          gatewayId: gatewayStatus.gatewayPaymentId,
          payerEmail: gatewayStatus.payerEmail,
          failureReason:
            status === 'FAILED' ? gatewayStatus.statusDetail : null,
          paidAt: status === 'PAID' ? gatewayStatus.approvedAt : null,
          metadata: gatewayStatus.raw,
        });
      } else {
        await this.transactionRepository.create({
          appointmentId,
          amount: gatewayStatus.amount,
          currency: gatewayStatus.currency,
          status,
          paymentMethod,
          gatewayId: gatewayStatus.gatewayPaymentId,
          externalRef,
          payerEmail: gatewayStatus.payerEmail,
          metadata: gatewayStatus.raw,
        });
      }
    }

    await this.syncAppointmentState(
      appointmentId,
      status,
      appointment.status,
      gatewayStatus.amount,
    );

    if (status === 'PAID' && appointment.status !== 'CANCELLED') {
      const userId = appointment.patient.profile.userId;
      if (userId) {
        await this.createNotificationUseCase.execute({
          userId,
          type: 'APPOINTMENT_CONFIRMED',
          channel: 'IN_APP',
          title: 'Pago confirmado',
          message: `Tu cita #${appointmentId} fue pagada y confirmada exitosamente.`,
          metadata: { appointmentId, paymentId: gatewayStatus.gatewayPaymentId },
        });
      }
    }

    this.logger.log(
      `[AUDIT] Webhook procesado | paymentId=${paymentId} appointmentId=${appointmentId} status=${status}`,
    );
  }

  private async syncAppointmentState(
    appointmentId: number,
    paymentStatus: PaymentStatusValue,
    currentApptStatus: string,
    gatewayAmount: number,
  ): Promise<void> {
    // Race: pago aprobado pero la cita ya fue cancelada (p. ej. por expiración).
    // Se marca la Transaction como PAID pero NO se re-confirma la cita — revisión manual.
    if (paymentStatus === 'PAID' && currentApptStatus === 'CANCELLED') {
      this.logger.warn(
        `[REVIEW] Pago aprobado para cita ${appointmentId} que ya estaba CANCELLED. Revisar manualmente.`,
      );
      await this.prisma.appointments.update({
        where: { id: appointmentId },
        data: { paymentStatus: 'PAID', amount: gatewayAmount },
      });
      return;
    }

    const dataByStatus: Partial<
      Record<PaymentStatusValue, Record<string, unknown>>
    > = {
      PAID: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        amount: gatewayAmount,
        pendingUntil: null,
        updatedAt: new Date(),
      },
      FAILED: { paymentStatus: 'FAILED', updatedAt: new Date() },
      REFUNDED: { paymentStatus: 'REFUNDED', updatedAt: new Date() },
    };

    const data = dataByStatus[paymentStatus];
    if (!data) return;

    await this.prisma.appointments.update({
      where: { id: appointmentId },
      data,
    });
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
    if (m.includes('transfer') || m.includes('bank') || m.includes('pagoefectivo')) {
      return 'TRANSFER';
    }
    return 'OTHER';
  }
}
