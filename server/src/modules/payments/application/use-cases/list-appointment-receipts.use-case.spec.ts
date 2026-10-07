import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListAppointmentReceiptsUseCase } from './list-appointment-receipts.use-case.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import type { TransactionEntity } from '../../domain/entities/transaction.entity.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

const patient: AuthenticatedUser = {
  id: 42,
  email: 'ana@mediclick.test',
  roleId: 5,
  roleName: 'PATIENT',
  clinicId: null,
};

const appointment = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  deleted: false,
  clinicId: 7,
  patient: { profile: { userId: 42 } },
  schedule: { doctor: { clinicId: 7, profile: { userId: 500 } } },
  ...overrides,
});

const transaction = (
  overrides: Partial<TransactionEntity>,
): TransactionEntity =>
  ({
    id: 1,
    appointmentId: 10,
    amount: 50,
    currency: 'PEN',
    paymentMethod: 'CREDIT_CARD',
    status: 'PAID',
    gatewayId: 'mp-1',
    preferenceId: null,
    externalRef: null,
    payerEmail: 'ana@mediclick.test',
    failureReason: null,
    paidAt: new Date('2026-10-01T15:00:00.000Z'),
    metadata: null,
    createdAt: new Date('2026-10-01T14:59:00.000Z'),
    ...overrides,
  }) as TransactionEntity;

describe('ListAppointmentReceiptsUseCase', () => {
  let prisma: { appointments: { findUnique: jest.Mock } };
  let transactions: jest.Mocked<
    Pick<ITransactionRepository, 'findByAppointmentId'>
  >;
  let useCase: ListAppointmentReceiptsUseCase;

  beforeEach(() => {
    prisma = {
      appointments: { findUnique: jest.fn().mockResolvedValue(appointment()) },
    };
    transactions = {
      findByAppointmentId: jest.fn().mockResolvedValue([
        transaction({
          id: 4,
          status: 'PENDING',
          paidAt: null,
          gatewayId: 'mp-4',
        }),
        transaction({
          id: 3,
          amount: 70,
          paidAt: new Date('2026-10-05T10:00:00.000Z'),
          gatewayId: 'mp-3',
        }),
        transaction({
          id: 2,
          status: 'FAILED',
          paidAt: null,
          gatewayId: 'mp-2',
        }),
        transaction({
          id: 1,
          amount: 50,
          paidAt: new Date('2026-10-01T15:00:00.000Z'),
        }),
      ]),
    } as unknown as jest.Mocked<
      Pick<ITransactionRepository, 'findByAppointmentId'>
    >;
    useCase = new ListAppointmentReceiptsUseCase(
      prisma as unknown as PrismaService,
      transactions as unknown as ITransactionRepository,
      new AppointmentAccessPolicy(),
    );
  });

  it('el paciente dueño recibe sus transacciones aprobadas (seña y saldo) en orden de pago', async () => {
    const receipts = await useCase.execute(patient, 10);

    expect(receipts.map((r) => [r.id, r.amount, r.status])).toEqual([
      [1, 50, 'PAID'],
      [3, 70, 'PAID'],
    ]);
  });

  it('otro paciente no ve los comprobantes', async () => {
    await expect(useCase.execute({ ...patient, id: 99 }, 10)).rejects.toThrow(
      NotFoundException,
    );
    expect(transactions.findByAppointmentId).not.toHaveBeenCalled();
  });

  it('el personal de otra sede no los ve y el de la sede de la cita sí', async () => {
    const staff = { ...patient, id: 300, roleName: 'RECEPTIONIST' };

    await expect(
      useCase.execute({ ...staff, clinicId: 8 }, 10),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute({ ...staff, clinicId: 7 }, 10),
    ).resolves.toHaveLength(2);
  });

  it('una cita eliminada o inexistente responde 404', async () => {
    prisma.appointments.findUnique.mockResolvedValueOnce(
      appointment({ deleted: true }),
    );
    await expect(useCase.execute(patient, 10)).rejects.toThrow(
      NotFoundException,
    );

    prisma.appointments.findUnique.mockResolvedValueOnce(null);
    await expect(useCase.execute(patient, 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sin pagos aprobados devuelve una lista vacía', async () => {
    transactions.findByAppointmentId.mockResolvedValue([
      transaction({ id: 4, status: 'PENDING', paidAt: null }),
    ]);

    await expect(useCase.execute(patient, 10)).resolves.toEqual([]);
  });

  it('un actor sin sede que no es paciente ni global queda rechazado por la política', async () => {
    await expect(
      useCase.execute(
        { ...patient, id: 300, roleName: 'RECEPTIONIST', clinicId: null },
        10,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
