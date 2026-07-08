import { NotFoundException } from '@nestjs/common';
import { UpdatePatientUseCase } from './update-patient.use-case.js';
import { PATIENT_UPDATED_EVENT } from '../../../../shared/events/patient-events.interface.js';

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
  const eventEmitter = { emit: jest.fn() };
  let useCase: UpdatePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePatientUseCase(repo as any, eventEmitter as any);
  });

  it('emite patient.updated tras actualizar', async () => {
    repo.findById.mockResolvedValue(patient);
    repo.update.mockResolvedValue(patient);

    await useCase.execute(7, { name: 'Ana María' } as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(PATIENT_UPDATED_EVENT, {
      patientId: 7,
    });
  });

  it('no emite si el paciente no existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99, {} as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
