import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/application/notifications.module.js';
import { PrismaTransactionRepository } from '../infrastructure/persistence/prisma-transaction.repository.js';
import { MercadoPagoGatewayService } from '../infrastructure/gateways/mercadopago-gateway.service.js';
import { CreatePaymentPreferenceUseCase } from './use-cases/create-payment-preference.use-case.js';
import { HandlePaymentWebhookUseCase } from './use-cases/handle-payment-webhook.use-case.js';
import { GetPaymentByAppointmentUseCase } from './use-cases/get-payment-by-appointment.use-case.js';
import { ExpirePendingAppointmentsUseCase } from './use-cases/expire-pending-appointments.use-case.js';
import { PaymentController } from '../interfaces/controllers/payment.controller.js';
import { PaymentWebhookController } from '../interfaces/controllers/payment-webhook.controller.js';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    {
      provide: 'ITransactionRepository',
      useClass: PrismaTransactionRepository,
    },
    {
      provide: 'IPaymentGatewayService',
      useClass: MercadoPagoGatewayService,
    },
    CreatePaymentPreferenceUseCase,
    HandlePaymentWebhookUseCase,
    GetPaymentByAppointmentUseCase,
    ExpirePendingAppointmentsUseCase,
  ],
  exports: ['ITransactionRepository'],
})
export class PaymentsModule {}
