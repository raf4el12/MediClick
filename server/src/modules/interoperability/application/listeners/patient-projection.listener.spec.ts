import { PatientProjectionListener } from './patient-projection.listener.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

const dbPatient = {
  id: 42,
  isActive: true,
  deleted: false,
  profile: {
    name: 'Ana',
    lastName: 'Díaz',
    birthday: null,
    gender: null,
    phone: null,
    address: null,
    typeDocument: 'DNI',
    numberDocument: '46871234',
  },
};

describe('PatientProjectionListener', () => {
  const prisma = { patients: { findUnique: jest.fn() } };
  const fhirResourceService = { save: jest.fn(), softDelete: jest.fn() };
  let listener: PatientProjectionListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new PatientProjectionListener(
      prisma as any,
      fhirResourceService as any,
    );
  });

  it('proyecta Patient + Provenance con clinicId null e id determinístico', async () => {
    prisma.patients.findUnique.mockResolvedValue(dbPatient);
    fhirResourceService.save.mockResolvedValue({});

    await listener.handleCreated({ patientId: 42 });

    expect(fhirResourceService.save).toHaveBeenCalledTimes(2);
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: fhirIdFor('Patient', 42),
        resourceType: 'Patient',
        clinicId: null,
      }),
    );
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: provenanceIdFor('Patient', 42),
        resourceType: 'Provenance',
        clinicId: null,
      }),
    );
  });

  it('si el paciente no existe, no guarda nada y no lanza', async () => {
    prisma.patients.findUnique.mockResolvedValue(null);

    await expect(
      listener.handleUpdated({ patientId: 99 }),
    ).resolves.toBeUndefined();
    expect(fhirResourceService.save).not.toHaveBeenCalled();
  });

  it('si el store falla, no propaga el error al emisor', async () => {
    prisma.patients.findUnique.mockResolvedValue(dbPatient);
    fhirResourceService.save.mockRejectedValue(new Error('db caída'));

    await expect(
      listener.handleCreated({ patientId: 42 }),
    ).resolves.toBeUndefined();
  });

  it('patient.deleted hace softDelete del recurso en el store', async () => {
    fhirResourceService.softDelete.mockResolvedValue(undefined);

    await listener.handleDeleted({ patientId: 42 });

    expect(fhirResourceService.softDelete).toHaveBeenCalledWith(
      'Patient',
      fhirIdFor('Patient', 42),
    );
    expect(fhirResourceService.save).not.toHaveBeenCalled();
  });
});
