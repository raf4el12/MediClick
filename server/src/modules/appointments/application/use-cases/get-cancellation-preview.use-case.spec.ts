/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { NotFoundException } from '@nestjs/common';
import { GetCancellationPreviewUseCase } from './get-cancellation-preview.use-case.js';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { AppointmentCancellationService } from '../services/appointment-cancellation.service.js';
import { CancellationPolicyService } from '../../domain/services/cancellation-policy.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { appointment } from './testing/patient-appointment.builder.js';

const patient: AuthenticatedUser = {
  id: 70,
  email: 'ana@test.local',
  roleId: 1,
  roleName: 'PATIENT',
  clinicId: null,
};

describe('GetCancellationPreviewUseCase', () => {
  let findById: jest.Mock;
  let cancelAtomically: jest.Mock;
  let specialtyRepository: { findById: jest.Mock };
  let transactionRepository: { findLatestByAppointmentId: jest.Mock };
  let deps: any[];

  const preview = () =>
    new GetCancellationPreviewUseCase(
      ...(deps as [any, any, any, any, any, any]),
    );

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00.000Z'));
    // Pagada, hoy a las 15:00 en Lima (8 h antes): dentro de una ventana de 24 h.
    const paid = appointment({
      id: 9,
      start: '15:00',
      paymentStatus: 'PAID',
      amount: 150,
    });
    findById = jest.fn().mockResolvedValue(paid);
    cancelAtomically = jest.fn().mockResolvedValue({
      appointment: paid,
      refundReviewTransactionId: null,
      transitioned: true,
    });
    specialtyRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 2, price: 150, cancellationWindowHours: 24 }),
    };
    transactionRepository = {
      findLatestByAppointmentId: jest.fn().mockResolvedValue(null),
    };
    deps = [
      { findById, cancelAtomically },
      specialtyRepository,
      transactionRepository,
      { resolveByDoctorId: jest.fn().mockResolvedValue('America/Lima') },
      new AppointmentAccessPolicy(),
      new CancellationPolicyService(),
    ];
  });

  afterEach(() => jest.useRealTimers());

  it('fuera de la ventana gratuita no hay penalización', async () => {
    findById.mockResolvedValue(
      appointment({
        id: 9,
        date: '2026-10-25',
        start: '15:00',
        paymentStatus: 'PAID',
        amount: 150,
      }),
    );

    await expect(preview().execute(9, patient)).resolves.toMatchObject({
      fee: 0,
      cancellable: true,
      freeCancellationWindowHours: 24,
    });
  });

  it('dentro de la ventana anticipa la misma penalización que cobra la cancelación', async () => {
    const result = await preview().execute(9, patient);
    expect(result.fee).toBeGreaterThan(0);
    expect(result).toMatchObject({ currency: 'PEN', cancellable: true });

    const cancel = new CancelAppointmentUseCase(
      deps[0],
      specialtyRepository as any,
      transactionRepository as any,
      deps[3],
      new AppointmentCancellationService(deps[0], { emit: jest.fn() } as any),
      new AppointmentAccessPolicy(),
      new CancellationPolicyService(),
    );
    await cancel.execute(9, { reason: 'No puedo asistir' }, patient);

    expect(cancelAtomically).toHaveBeenCalledWith(
      expect.objectContaining({ cancellationFee: result.fee }),
    );
  });

  it('sin fondos cobrados no hay penalización', async () => {
    findById.mockResolvedValue(
      appointment({
        id: 9,
        start: '15:00',
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
      }),
    );

    await expect(preview().execute(9, patient)).resolves.toMatchObject({
      fee: 0,
    });
  });

  it('una cita completada o cancelada no se puede cancelar', async () => {
    findById.mockResolvedValue(
      appointment({ id: 9, status: AppointmentStatus.COMPLETED }),
    );
    await expect(preview().execute(9, patient)).resolves.toMatchObject({
      cancellable: false,
      fee: 0,
    });

    findById.mockResolvedValue(
      appointment({ id: 9, status: AppointmentStatus.CANCELLED }),
    );
    await expect(preview().execute(9, patient)).resolves.toMatchObject({
      cancellable: false,
      fee: 0,
    });
  });

  it('la cita de otro paciente responde 404', async () => {
    await expect(
      preview().execute(9, { ...patient, id: 71 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
