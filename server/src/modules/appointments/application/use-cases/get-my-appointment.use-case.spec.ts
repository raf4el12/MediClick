import { NotFoundException } from '@nestjs/common';
import { GetMyAppointmentUseCase } from './get-my-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { appointment } from './testing/patient-appointment.builder.js';

describe('GetMyAppointmentUseCase', () => {
  let useCase: GetMyAppointmentUseCase;
  let findById: jest.Mock;
  let findByUserId: jest.Mock;

  beforeEach(() => {
    findById = jest
      .fn()
      .mockResolvedValue(appointment({ id: 9, patientId: 7 }));
    findByUserId = jest.fn().mockResolvedValue({ id: 7 });
    useCase = new GetMyAppointmentUseCase(
      { findById } as unknown as IAppointmentRepository,
      { findByUserId } as unknown as IPatientRepository,
    );
  });

  it('el paciente ve su cita con la sede', async () => {
    const result = await useCase.execute(70, 9);

    expect(result.id).toBe(9);
    expect(result.clinic).toEqual({
      id: 1,
      name: 'Sede Miraflores',
      address: 'Av. Larco 1150',
      currency: 'PEN',
    });
  });

  it('la cita de otro paciente responde 404, igual que una inexistente', async () => {
    findById.mockResolvedValue(appointment({ id: 9, patientId: 8 }));
    await expect(useCase.execute(70, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    findById.mockResolvedValue(null);
    await expect(useCase.execute(70, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('un usuario sin perfil de paciente recibe 404 sin consultar la cita', async () => {
    findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(70, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findById).not.toHaveBeenCalled();
  });
});
