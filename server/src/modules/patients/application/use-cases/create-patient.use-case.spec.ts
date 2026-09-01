import { ConflictException } from '@nestjs/common';
import { CreatePatientUseCase } from './create-patient.use-case.js';
import type { PatientEventIdentity } from '../../domain/repositories/patient.repository.js';

const createdPatient = {
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

describe('CreatePatientUseCase', () => {
  const repo = {
    existsByEmail: jest.fn(),
    existsByDni: jest.fn(),
    create: jest.fn(),
  };
  const passwordService = { hash: jest.fn() };
  let useCase: CreatePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePatientUseCase(repo as any, passwordService as any);
  });

  it('delega patient.created con identidad durable al repositorio', async () => {
    repo.existsByEmail.mockResolvedValue(false);
    passwordService.hash.mockResolvedValue('hashed');
    repo.create.mockResolvedValue(createdPatient);

    await useCase.execute({
      name: 'Ana',
      lastName: 'Díaz',
      email: 'ana@x.com',
      emergencyContact: '+51988877766',
      bloodType: 'O+',
    } as any);

    const [, identity] = repo.create.mock.calls[0] as [
      unknown,
      PatientEventIdentity,
    ];
    expect(typeof identity.operationId).toBe('string');
    expect(typeof identity.eventId).toBe('string');
    expect(identity.occurredAt).toBeInstanceOf(Date);
  });

  it('no crea ni registra evento si el email ya existe', async () => {
    repo.existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: 'ana@x.com' } as any),
    ).rejects.toThrow(ConflictException);
    expect(repo.create.mock.calls).toHaveLength(0);
  });
});
