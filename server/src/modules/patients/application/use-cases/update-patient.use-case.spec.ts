import { NotFoundException } from '@nestjs/common';
import { UpdatePatientUseCase } from './update-patient.use-case.js';
import type { PatientEventIdentity } from '../../domain/repositories/patient.repository.js';

const patient = {
  id: 7,
  emergencyContact: '+51988877766',
  bloodType: 'O+',
  allergies: null,
  chronicConditions: null,
  isActive: true,
  createdAt: new Date(),
  profile: {
    id: 1,
    name: 'Ana',
    lastName: 'Díaz',
    email: 'ana@x.com',
    phone: null,
    birthday: null,
    gender: null,
    typeDocument: null,
    numberDocument: null,
  },
};

describe('UpdatePatientUseCase', () => {
  const repo = { findById: jest.fn(), update: jest.fn() };
  let useCase: UpdatePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePatientUseCase(repo as any);
  });

  it('delega patient.updated con identidad durable al repositorio', async () => {
    repo.findById.mockResolvedValue(patient);
    repo.update.mockResolvedValue(patient);

    await useCase.execute(7, { name: 'Ana María' } as any);

    const [patientId, , identity] = repo.update.mock.calls[0] as [
      number,
      unknown,
      PatientEventIdentity,
    ];
    expect(patientId).toBe(7);
    expect(typeof identity.operationId).toBe('string');
    expect(typeof identity.eventId).toBe('string');
    expect(identity.occurredAt).toBeInstanceOf(Date);
  });

  it('no actualiza ni registra evento si el paciente no existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99, {} as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.update.mock.calls).toHaveLength(0);
  });
});
