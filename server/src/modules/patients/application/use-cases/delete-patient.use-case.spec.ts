import { NotFoundException } from '@nestjs/common';
import { DeletePatientUseCase } from './delete-patient.use-case.js';
import type { PatientEventIdentity } from '../../domain/repositories/patient.repository.js';

describe('DeletePatientUseCase', () => {
  const repo = { findById: jest.fn(), softDelete: jest.fn() };
  let useCase: DeletePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeletePatientUseCase(repo as any);
  });

  it('delega soft delete y patient.deleted bajo una identidad durable', async () => {
    repo.findById.mockResolvedValue({ id: 7 });
    repo.softDelete.mockResolvedValue(undefined);

    await useCase.execute(7);

    const [patientId, identity] = repo.softDelete.mock.calls[0] as [
      number,
      PatientEventIdentity,
    ];
    expect(patientId).toBe(7);
    expect(typeof identity.operationId).toBe('string');
    expect(typeof identity.eventId).toBe('string');
    expect(identity.occurredAt).toBeInstanceOf(Date);
  });

  it('no borra ni registra evento si el paciente no existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(NotFoundException);
    expect(repo.softDelete.mock.calls).toHaveLength(0);
  });
});
