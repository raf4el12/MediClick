import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentPreferenceUseCase } from './create-payment-preference.use-case.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import type { IPaymentGatewayService } from '../../domain/services/payment-gateway.service.js';

describe('CreatePaymentPreferenceUseCase', () => {
  let useCase: CreatePaymentPreferenceUseCase;
  let prisma: { appointments: { findUnique: jest.Mock } };
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let gateway: jest.Mocked<IPaymentGatewayService>;

  const futureDate = new Date(Date.now() + 10 * 60 * 1000);

  const buildAppointment = (overrides: Partial<any> = {}) => ({
    id: 123,
    deleted: false,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    amount: null,
    pendingUntil: futureDate,
    patient: {
      id: 1,
      profile: { userId: 42, user: { email: 'paciente@example.com' } },
    },
    schedule: {
      scheduleDate: new Date('2026-05-01'),
      specialty: { name: 'Cardiología', price: 120 },
    },
    ...overrides,
  });

  beforeEach(() => {
    prisma = { appointments: { findUnique: jest.fn() } };
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

    process.env.MP_NOTIFICATION_URL = 'https://example.com/payments/webhook';

    useCase = new CreatePaymentPreferenceUseCase(
      prisma as any,
      transactionRepository,
      gateway,
    );
  });

  afterEach(() => {
    delete process.env.MP_NOTIFICATION_URL;
  });

  it('creates a preference for a valid pending appointment', async () => {
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    gateway.createPreference.mockResolvedValue({
      preferenceId: 'pref_123',
      initPoint: 'https://mp/init_point',
      sandboxInitPoint: 'https://mp/sandbox',
    });

    const result = await useCase.execute(42, { appointmentId: 123 });

    expect(result.preferenceId).toBe('pref_123');
    expect(gateway.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        externalReference: '123',
        items: expect.arrayContaining([
          expect.objectContaining({ unitPrice: 120, currencyId: 'PEN' }),
        ]),
        payerEmail: 'paciente@example.com',
        notificationUrl: 'https://example.com/payments/webhook',
      }),
    );
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 123,
        amount: 120,
        status: 'PENDING',
        preferenceId: 'pref_123',
        externalRef: '123',
      }),
    );
  });

  it('throws NotFoundException when appointment does not exist', async () => {
    prisma.appointments.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute(42, { appointmentId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when appointment belongs to another user', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        patient: { id: 1, profile: { userId: 7, user: { email: 'otro@example.com' } } },
      }),
    );

    await expect(
      useCase.execute(42, { appointmentId: 123 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects already paid appointments', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ paymentStatus: 'PAID' }),
    );

    await expect(
      useCase.execute(42, { appointmentId: 123 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects appointments past their pendingUntil deadline', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ pendingUntil: new Date(Date.now() - 1000) }),
    );

    await expect(
      useCase.execute(42, { appointmentId: 123 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects appointments whose specialty has no price', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        schedule: {
          scheduleDate: new Date(),
          specialty: { name: 'X', price: null },
        },
      }),
    );

    await expect(
      useCase.execute(42, { appointmentId: 123 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails when MP_NOTIFICATION_URL is missing', async () => {
    delete process.env.MP_NOTIFICATION_URL;
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());

    await expect(
      useCase.execute(42, { appointmentId: 123 }),
    ).rejects.toThrow(BadRequestException);
    expect(gateway.createPreference).not.toHaveBeenCalled();
  });
});
