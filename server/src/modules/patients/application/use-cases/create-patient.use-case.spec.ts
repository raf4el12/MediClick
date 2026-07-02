import { ConflictException } from '@nestjs/common';
import { CreatePatientUseCase } from './create-patient.use-case.js';
import { PATIENT_CREATED_EVENT } from '../../../../shared/events/patient-events.interface.js';

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
  const eventEmitter = { emit: jest.fn() };
  let useCase: CreatePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePatientUseCase(
      repo as any,
      passwordService as any,
      eventEmitter as any,
    );
  });

  it('emite patient.created con el id del paciente', async () => {
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

    expect(eventEmitter.emit).toHaveBeenCalledWith(PATIENT_CREATED_EVENT, {
      patientId: 7,
    });
  });

  it('no emite si el email ya existe', async () => {
    repo.existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: 'ana@x.com' } as any),
    ).rejects.toThrow(ConflictException);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
