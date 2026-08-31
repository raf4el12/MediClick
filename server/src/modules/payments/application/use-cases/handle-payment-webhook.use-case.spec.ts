import type { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import type { IPaymentReconciliationRepository } from '../../domain/repositories/payment-reconciliation.repository.js';
import type {
  GatewayPaymentStatus,
  IPaymentGatewayService,
} from '../../domain/services/payment-gateway.service.js';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case.js';

describe('HandlePaymentWebhookUseCase', () => {
  let useCase: HandlePaymentWebhookUseCase;
  let reconciliation: jest.Mocked<IPaymentReconciliationRepository>;
  let gateway: jest.Mocked<IPaymentGatewayService>;
  let createNotification: jest.Mocked<
    Pick<CreateNotificationUseCase, 'execute'>
  >;

  const buildGatewayStatus = (
    overrides: Partial<GatewayPaymentStatus> = {},
  ): GatewayPaymentStatus => ({
    gatewayPaymentId: 'mp_987',
    status: 'approved',
    externalReference: '123',
    amount: 120,
    currency: 'PEN',
    paymentMethod: 'visa',
    payerEmail: 'paciente@example.com',
    statusDetail: 'accredited',
    approvedAt: new Date('2026-04-23T10:00:00Z'),
    raw: { id: 'mp_987' },
    ...overrides,
  });

  beforeEach(() => {
    reconciliation = { reconcile: jest.fn() };
    gateway = {
      createPreference: jest.fn(),
      getPayment: jest.fn(),
      validateWebhookSignature: jest.fn(),
    };
    createNotification = { execute: jest.fn() };

    useCase = new HandlePaymentWebhookUseCase(
      reconciliation,
      gateway,
      createNotification as any,
    );
  });

  it('silently ignores payloads without data.id', async () => {
    await useCase.execute({ type: 'payment' } as any);
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('ignores non-payment event types', async () => {
    await useCase.execute({
      type: 'topic_claim_integration',
      data: { id: 'x' },
    } as any);
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('reconciles an approved payment and notifies only after confirmation', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    reconciliation.reconcile.mockResolvedValue({
      appointmentId: 123,
      appointmentStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      financialReviewRequired: false,
      notificationUserId: 42,
      clinicId: 7,
    });

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(reconciliation.reconcile).toHaveBeenCalledWith({
      appointmentId: 123,
      gatewayId: 'mp_987',
      externalRef: '123',
      amount: 120,
      currency: 'PEN',
      status: 'PAID',
      paymentMethod: 'CREDIT_CARD',
      payerEmail: 'paciente@example.com',
      failureReason: null,
      paidAt: new Date('2026-04-23T10:00:00Z'),
      raw: { id: 'mp_987' },
    });
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        clinicId: 7,
        type: 'APPOINTMENT_CONFIRMED',
      }),
    );
  });

  it('never reactivates or notifies an appointment cancelled before reconciliation', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    reconciliation.reconcile.mockResolvedValue({
      appointmentId: 123,
      appointmentStatus: 'CANCELLED',
      paymentStatus: 'PAID',
      financialReviewRequired: true,
      notificationUserId: null,
      clinicId: 7,
    });

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('maps a rejected gateway payment to FAILED', async () => {
    gateway.getPayment.mockResolvedValue(
      buildGatewayStatus({
        status: 'rejected',
        statusDetail: 'cc_rejected_other_reason',
      }),
    );
    reconciliation.reconcile.mockResolvedValue({
      appointmentId: 123,
      appointmentStatus: 'PENDING',
      paymentStatus: 'FAILED',
      financialReviewRequired: false,
      notificationUserId: null,
      clinicId: 7,
    });

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(reconciliation.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        failureReason: 'cc_rejected_other_reason',
      }),
    );
  });

  it('does not notify when the referenced appointment does not exist', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    reconciliation.reconcile.mockResolvedValue(null);

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('propagates gateway failures so Mercado Pago can retry', async () => {
    gateway.getPayment.mockRejectedValue(new Error('MP down'));

    await expect(
      useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any),
    ).rejects.toThrow('MP down');
    expect(reconciliation.reconcile).not.toHaveBeenCalled();
  });
});
