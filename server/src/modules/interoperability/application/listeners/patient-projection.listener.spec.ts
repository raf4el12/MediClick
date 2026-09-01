import { PatientProjectionListener } from './patient-projection.listener.js';
import { fhirIdFor, provenanceIdFor } from '../../domain/fhir-id.logic.js';
import {
  PATIENT_CREATED_EVENT,
  PATIENT_DELETED_EVENT,
  PATIENT_UPDATED_EVENT,
} from '../../../../shared/events/patient-events.interface.js';
import { buildDurableEvent } from '../../../../shared/outbox/domain/durable-domain-event.js';

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

function patientEvent(type = PATIENT_CREATED_EVENT, eventId = 'evt-1') {
  return buildDurableEvent({
    eventId,
    type,
    schemaVersion: 1,
    aggregateType: 'patient',
    aggregateId: '42',
    operationId: 'op-1',
    clinicId: null,
    occurredAt: '2026-07-10T14:00:00.000Z',
    payload: { patientId: 42 },
  });
}

describe('PatientProjectionListener', () => {
  const prisma = { patients: { findUnique: jest.fn() } };
  const fhirResourceService = { applyProjection: jest.fn() };
  let listener: PatientProjectionListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new PatientProjectionListener(
      prisma as never,
      fhirResourceService as never,
    );
  });

  it('aplica Patient + Provenance y recibo en una sola operación', async () => {
    prisma.patients.findUnique.mockResolvedValue(dbPatient);
    fhirResourceService.applyProjection.mockResolvedValue('applied');

    await listener.handleCreated(patientEvent());

    expect(fhirResourceService.applyProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerName: 'fhir-patient-projection',
        eventId: 'evt-1',
        upserts: [
          expect.objectContaining({
            id: fhirIdFor('Patient', 42),
            resourceType: 'Patient',
            clinicId: null,
          }),
          expect.objectContaining({
            id: provenanceIdFor('Patient', 42),
            resourceType: 'Provenance',
            clinicId: null,
          }),
        ],
      }),
    );
  });

  it('propaga paciente inexistente para que el worker reintente o haga dead-letter', async () => {
    prisma.patients.findUnique.mockResolvedValue(null);

    await expect(
      listener.handleUpdated(patientEvent(PATIENT_UPDATED_EVENT)),
    ).rejects.toThrow('Patient 42 no encontrado');
    expect(fhirResourceService.applyProjection).not.toHaveBeenCalled();
  });

  it('propaga el fallo del store al worker', async () => {
    prisma.patients.findUnique.mockResolvedValue(dbPatient);
    fhirResourceService.applyProjection.mockRejectedValue(
      new Error('db caída'),
    );

    await expect(listener.handleCreated(patientEvent())).rejects.toThrow(
      'db caída',
    );
  });

  it('patient.deleted aplica el recibo y el soft delete juntos', async () => {
    prisma.patients.findUnique.mockResolvedValue({
      ...dbPatient,
      deleted: true,
    });
    fhirResourceService.applyProjection.mockResolvedValue('applied');

    await listener.handleDeleted(patientEvent(PATIENT_DELETED_EVENT));

    expect(fhirResourceService.applyProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerName: 'fhir-patient-projection',
        eventId: 'evt-1',
        upserts: [],
        deletes: [{ resourceType: 'Patient', id: fhirIdFor('Patient', 42) }],
      }),
    );
  });
});
