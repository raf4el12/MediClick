import { NotFoundException } from '@nestjs/common';
import { GetPaymentByAppointmentUseCase } from './get-payment-by-appointment.use-case.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('GetPaymentByAppointmentUseCase', () => {
  let useCase: GetPaymentByAppointmentUseCase;
  let prisma: { appointments: { findUnique: jest.Mock } };
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let handlePaymentWebhookUseCase: { execute: jest.Mock };

  const buildActor = (
    overrides: Partial<AuthenticatedUser> = {},
  ): AuthenticatedUser => ({
    id: 42,
    email: 'actor@mediclick.test',
    roleId: 1,
    roleName: SystemRole.PATIENT,
    clinicId: null,
    ...overrides,
  });

  const buildAppointment = (overrides: Record<string, unknown> = {}) => ({
    id: 10,
    deleted: false,
    clinicId: 7,
    patient: { profile: { userId: 42 } },
    schedule: {
      doctor: { clinicId: 7, profile: { userId: 500 } },
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
      findAll: jest.fn(),
    };
    handlePaymentWebhookUseCase = { execute: jest.fn() };

    useCase = new GetPaymentByAppointmentUseCase(
      prisma as any,
      transactionRepository,
      handlePaymentWebhookUseCase as any,
      new AppointmentAccessPolicy(),
    );
  });

  it('returns the latest transaction for an appointment owned by the patient', async () => {
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
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
      clinicId: null,
      createdAt: new Date(),
      updatedAt: null,
    });

    const result = await useCase.execute(buildActor(), 10);

    expect(result.status).toBe('PAID');
    expect(result.amount).toBe(120);
  });

  it('forbids a patient from reading someone else payment', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ patient: { profile: { userId: 99 } } }),
    );

    await expect(useCase.execute(buildActor(), 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not authorize clinic staff to read another clinic payment', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({
        clinicId: 8,
        patient: { profile: { userId: 99 } },
        schedule: {
          doctor: { clinicId: 8, profile: { userId: 500 } },
        },
      }),
    );

    await expect(
      useCase.execute(
        buildActor({
          roleName: SystemRole.RECEPTIONIST,
          clinicId: 7,
        }),
        10,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(
      transactionRepository.findLatestByAppointmentId,
    ).not.toHaveBeenCalled();
  });

  it('allows ADMIN to read any appointment payment', async () => {
    prisma.appointments.findUnique.mockResolvedValue(
      buildAppointment({ patient: { profile: { userId: 99 } } }),
    );
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
      clinicId: null,
      createdAt: new Date(),
      updatedAt: null,
    });

    const result = await useCase.execute(
      buildActor({ roleName: SystemRole.ADMIN, clinicId: null }),
      10,
    );

    expect(result.id).toBe(2);
  });

  it('throws NotFoundException when the appointment has no transaction yet', async () => {
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await expect(useCase.execute(buildActor(), 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('re-syncs a PENDING transaction via the webhook when a paymentId is provided', async () => {
    prisma.appointments.findUnique.mockResolvedValue(buildAppointment());
    const pending = {
      id: 3,
      appointmentId: 10,
      amount: 100,
      currency: 'PEN',
      status: 'PENDING',
      paymentMethod: null,
      gatewayId: null,
      preferenceId: 'pref_3',
      externalRef: '10',
      payerEmail: null,
      failureReason: null,
      paidAt: null,
      metadata: null,
      clinicId: null,
      createdAt: new Date(),
      updatedAt: null,
    };
    transactionRepository.findLatestByAppointmentId
      .mockResolvedValueOnce(pending as any)
      .mockResolvedValueOnce({
        ...pending,
        status: 'PAID',
        paidAt: new Date(),
      } as any);

    const result = await useCase.execute(buildActor(), 10, 'mp_999');

    expect(handlePaymentWebhookUseCase.execute).toHaveBeenCalledWith({
      type: 'payment',
      data: { id: 'mp_999' },
    });
    expect(result.status).toBe('PAID');
  });
});
