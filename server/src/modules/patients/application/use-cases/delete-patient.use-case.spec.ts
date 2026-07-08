import { NotFoundException } from '@nestjs/common';
import { DeletePatientUseCase } from './delete-patient.use-case.js';
import { PATIENT_DELETED_EVENT } from '../../../../shared/events/patient-events.interface.js';

describe('DeletePatientUseCase', () => {
  const repo = { findById: jest.fn(), softDelete: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  let useCase: DeletePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeletePatientUseCase(repo as any, eventEmitter as any);
  });

  it('emite patient.deleted tras el soft delete', async () => {
    repo.findById.mockResolvedValue({ id: 7 });
    repo.softDelete.mockResolvedValue(undefined);

    await useCase.execute(7);

    expect(repo.softDelete).toHaveBeenCalledWith(7);
    expect(eventEmitter.emit).toHaveBeenCalledWith(PATIENT_DELETED_EVENT, {
      patientId: 7,
    });
  });

  it('no emite si el paciente no existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(NotFoundException);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
