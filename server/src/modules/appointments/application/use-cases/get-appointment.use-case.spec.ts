import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetAppointmentUseCase } from './get-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { appointment } from './testing/patient-appointment.builder.js';

const actor = (
  roleName: string,
  clinicId: number | null,
  id = 900,
): AuthenticatedUser => ({
  id,
  email: 'actor@test.local',
  roleId: 1,
  roleName,
  clinicId,
});

describe('GetAppointmentUseCase', () => {
  let findById: jest.Mock;
  let useCase: GetAppointmentUseCase;

  beforeEach(() => {
    const row = appointment({ id: 9, clinicId: 1 });
    row.schedule.doctor.profile.userId = 40;
    findById = jest.fn().mockResolvedValue(row);
    useCase = new GetAppointmentUseCase(
      { findById } as unknown as IAppointmentRepository,
      new AppointmentAccessPolicy(),
    );
  });

  it('el personal de la sede ve la cita con su sede, como el paciente', async () => {
    const result = await useCase.execute(actor('RECEPTIONIST', 1), 9);

    expect(result.id).toBe(9);
    expect(result.timezone).toBe('America/Lima');
    expect(result.clinic).toEqual({
      id: 1,
      name: 'Sede Miraflores',
      address: 'Av. Larco 1150',
      currency: 'PEN',
    });
  });

  it('el personal de otra sede recibe 404', async () => {
    await expect(useCase.execute(actor('ADMIN', 2), 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('un actor global ve cualquier cita', async () => {
    await expect(
      useCase.execute(actor('SUPER_ADMIN', null), 9),
    ).resolves.toMatchObject({ id: 9 });
    await expect(
      useCase.execute(actor('ADMIN', null), 9),
    ).resolves.toMatchObject({ id: 9 });
  });

  it('el médico ve solo sus citas', async () => {
    await expect(
      useCase.execute(actor('DOCTOR', 1, 40), 9),
    ).resolves.toMatchObject({ id: 9 });
    await expect(
      useCase.execute(actor('DOCTOR', 1, 41), 9),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('personal sin sede que no es global recibe 403', async () => {
    await expect(
      useCase.execute(actor('RECEPTIONIST', null), 9),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el paciente recibe 404 sin consultar la cita; una inexistente también', async () => {
    await expect(
      useCase.execute(actor('PATIENT', null, 70), 9),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findById).not.toHaveBeenCalled();

    findById.mockResolvedValue(null);
    await expect(useCase.execute(actor('ADMIN', 1), 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
