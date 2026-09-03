/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
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
  let prisma: {
    appointments: {
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };
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
    prisma = { appointments: { findUnique: jest.fn(), update: jest.fn() } };
    transactionRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByGatewayId: jest.fn(),
      findByPreferenceId: jest.fn(),
      findLatestByAppointmentId: jest.fn(),
      findByAppointmentId: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
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

    await expect(useCase.execute(42, { appointmentId: 999 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when appointment belongs to another user', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        patient: {
          id: 1,
          profile: { userId: 7, user: { email: 'otro@example.com' } },
        },
      }),
    );

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects already paid appointments', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ paymentStatus: 'PAID' }),
    );

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects appointments past their pendingUntil deadline', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ pendingUntil: new Date(Date.now() - 1000) }),
    );

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      BadRequestException,
    );
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

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('fails when MP_NOTIFICATION_URL is missing', async () => {
    delete process.env.MP_NOTIFICATION_URL;
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      BadRequestException,
    );
    expect(gateway.createPreference).not.toHaveBeenCalled();
  });

  it('RED->GREEN: cobra solo la seña/depósito si la especialidad tiene depositPercentage configurado', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        amount: 200,
        schedule: {
          scheduleDate: new Date(),
          specialty: {
            name: 'Cardiología',
            price: 200,
            depositPercentage: 25, // 25% de 200 = 50 PEN
            depositAmount: null,
          },
        },
      }),
    );
    prisma.appointments.update.mockResolvedValue({ id: 123 });
    gateway.createPreference.mockResolvedValue({
      preferenceId: 'pref_deposit_50',
      initPoint: 'https://mp/init_point',
      sandboxInitPoint: 'https://mp/sandbox',
    });

    const result = await useCase.execute(42, { appointmentId: 123 });

    expect(result.preferenceId).toBe('pref_deposit_50');
    expect(gateway.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            unitPrice: 50,
            title: expect.stringContaining('Seña'),
          }),
        ]),
      }),
    );
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 123,
        amount: 50,
      }),
    );
  });

  it('RED->GREEN: crea preferencia de saldo para cita PARTIAL y status CONFIRMED', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        status: 'CONFIRMED',
        paymentStatus: 'PARTIAL',
        amount: 200,
        depositAmount: 50,
      }),
    );
    transactionRepository.findByAppointmentId.mockResolvedValue([
      {
        id: 1,
        appointmentId: 123,
        amount: 50,
        currency: 'PEN',
        status: 'PAID',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);
    gateway.createPreference.mockResolvedValue({
      preferenceId: 'pref_balance_150',
      initPoint: 'https://mp/init_point',
      sandboxInitPoint: 'https://mp/sandbox',
    });

    const result = await useCase.execute(42, { appointmentId: 123 });

    expect(result.preferenceId).toBe('pref_balance_150');
    expect(gateway.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            unitPrice: 150,
            title: expect.stringContaining('Saldo'),
          }),
        ]),
      }),
    );
    expect(prisma.appointments.update).not.toHaveBeenCalled();
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 123,
        amount: 150,
        status: 'PENDING',
      }),
    );
  });

  it('RED->GREEN: rechaza preferencia de saldo si el acumulado pagado ya cubre el total', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        status: 'CONFIRMED',
        paymentStatus: 'PARTIAL',
        amount: 200,
      }),
    );
    transactionRepository.findByAppointmentId.mockResolvedValue([
      {
        id: 1,
        appointmentId: 123,
        amount: 200,
        currency: 'PEN',
        status: 'PAID',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      BadRequestException,
    );
    expect(gateway.createPreference).not.toHaveBeenCalled();
  });

  it('RED->GREEN: rechaza si ya existe una transacción PENDING sin resolver', async () => {
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    transactionRepository.findByAppointmentId.mockResolvedValue([
      {
        id: 2,
        appointmentId: 123,
        amount: 120,
        currency: 'PEN',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);

    await expect(useCase.execute(42, { appointmentId: 123 })).rejects.toThrow(
      BadRequestException,
    );
    expect(gateway.createPreference).not.toHaveBeenCalled();
  });
});
