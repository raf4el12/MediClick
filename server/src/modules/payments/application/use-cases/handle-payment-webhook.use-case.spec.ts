import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import type {
  GatewayPaymentStatus,
  IPaymentGatewayService,
} from '../../domain/services/payment-gateway.service.js';
import type { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';

describe('HandlePaymentWebhookUseCase', () => {
  let useCase: HandlePaymentWebhookUseCase;
  let prisma: {
    appointments: { findUnique: jest.Mock; update: jest.Mock };
  };
  let transactionRepository: jest.Mocked<ITransactionRepository>;
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

  const buildAppointment = (overrides: Partial<any> = {}) => ({
    id: 123,
    status: 'PENDING',
    patient: {
      profile: { userId: 42, name: 'Ana', lastName: 'Gómez' },
    },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      appointments: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    transactionRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByGatewayId: jest.fn(),
      findByPreferenceId: jest.fn(),
      findLatestByAppointmentId: jest.fn(),
      findByAppointmentId: jest.fn(),
    };
    gateway = {
      createPreference: jest.fn(),
      getPayment: jest.fn(),
      validateWebhookSignature: jest.fn(),
    };
    createNotification = { execute: jest.fn() };

    useCase = new HandlePaymentWebhookUseCase(
      prisma as any,
      transactionRepository,
      gateway,
      createNotification as any,
    );
  });

  it('silently ignores payloads without data.id', async () => {
    await useCase.execute({ type: 'payment' } as any);
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('ignores non-payment event types', async () => {
    await useCase.execute({ type: 'topic_claim_integration', data: { id: 'x' } } as any);
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('marks appointment as PAID/CONFIRMED and notifies patient when approved', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    transactionRepository.findByGatewayId.mockResolvedValue(null);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PAID',
        paymentMethod: 'CREDIT_CARD',
        gatewayId: 'mp_987',
      }),
    );
    expect(prisma.appointments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123 },
        data: expect.objectContaining({
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          amount: 120,
        }),
      }),
    );
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        type: 'APPOINTMENT_CONFIRMED',
      }),
    );
  });

  it('is idempotent: updates existing transaction instead of creating a duplicate', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    transactionRepository.findByGatewayId.mockResolvedValue({
      id: 55,
      appointmentId: 123,
      status: 'PAID',
      gatewayId: 'mp_987',
    } as any);

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(transactionRepository.update).toHaveBeenCalledWith(
      55,
      expect.objectContaining({ status: 'PAID' }),
    );
  });

  it('attaches gatewayId to an existing PENDING transaction (webhook after preference creation)', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    transactionRepository.findByGatewayId.mockResolvedValue(null);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PENDING',
      gatewayId: null,
    } as any);

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(transactionRepository.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        gatewayId: 'mp_987',
        status: 'PAID',
      }),
    );
  });

  it('flags review when approved payment arrives for a CANCELLED appointment', async () => {
    gateway.getPayment.mockResolvedValue(buildGatewayStatus());
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ status: 'CANCELLED' }),
    );
    transactionRepository.findByGatewayId.mockResolvedValue(null);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    // Se marca el pago pero NO se re-confirma la cita
    expect(prisma.appointments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'PAID' }),
      }),
    );
    const call = prisma.appointments.update.mock.calls[0][0];
    expect(call.data.status).toBeUndefined();
    // Tampoco notifica al paciente (cita ya no está viva)
    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('maps rejected payment to FAILED and updates appointment paymentStatus', async () => {
    gateway.getPayment.mockResolvedValue(
      buildGatewayStatus({ status: 'rejected', statusDetail: 'cc_rejected_other_reason' }),
    );
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    transactionRepository.findByGatewayId.mockResolvedValue(null);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any);

    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' }),
    );
    expect(prisma.appointments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'FAILED' }),
      }),
    );
  });

  it('does not throw when gateway query fails (avoids retry loop from MP)', async () => {
    gateway.getPayment.mockRejectedValue(new Error('MP down'));

    await expect(
      useCase.execute({ type: 'payment', data: { id: 'mp_987' } } as any),
    ).resolves.toBeUndefined();
  });
});
