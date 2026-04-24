import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetPaymentByAppointmentUseCase } from './get-payment-by-appointment.use-case.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';

describe('GetPaymentByAppointmentUseCase', () => {
  let useCase: GetPaymentByAppointmentUseCase;
  let prisma: { appointments: { findUnique: jest.Mock } };
  let transactionRepository: jest.Mocked<ITransactionRepository>;

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

    useCase = new GetPaymentByAppointmentUseCase(
      prisma as any,
      transactionRepository,
    );
  });

  it('returns the latest transaction for an appointment owned by the patient', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      id: 10,
      deleted: false,
      patient: { profile: { userId: 42 } },
    });
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 1,
      appointmentId: 10,
      amount: 120,
      currency: 'PEN',
      status: 'PAID',
      paymentMethod: 'CREDIT_CARD',
      gatewayId: 'mp_1',
      preferenceId: 'pref_1',
      externalRef: '10',
      payerEmail: 'p@x.com',
      failureReason: null,
      paidAt: new Date(),
      metadata: null,
      createdAt: new Date(),
      updatedAt: null,
    });

    const result = await useCase.execute(42, 'PATIENT', 10);

    expect(result.status).toBe('PAID');
    expect(result.amount).toBe(120);
  });

  it('forbids a patient from reading someone else payment', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      id: 10,
      deleted: false,
      patient: { profile: { userId: 99 } },
    });

    await expect(
      useCase.execute(42, 'PATIENT', 10),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows ADMIN to read any appointment payment', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      id: 10,
      deleted: false,
      patient: { profile: { userId: 99 } },
    });
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 2,
      appointmentId: 10,
      amount: 80,
      currency: 'PEN',
      status: 'PENDING',
      paymentMethod: null,
      gatewayId: null,
      preferenceId: 'pref_2',
      externalRef: '10',
      payerEmail: null,
      failureReason: null,
      paidAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: null,
    });

    const result = await useCase.execute(42, 'ADMIN', 10);

    expect(result.id).toBe(2);
  });

  it('throws NotFoundException when the appointment has no transaction yet', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      id: 10,
      deleted: false,
      patient: { profile: { userId: 42 } },
    });
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await expect(
      useCase.execute(42, 'PATIENT', 10),
    ).rejects.toThrow(NotFoundException);
  });
});
