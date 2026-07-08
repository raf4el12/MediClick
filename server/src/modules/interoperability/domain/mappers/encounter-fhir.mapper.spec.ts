import { toFhirEncounter } from './encounter-fhir.mapper.js';
import { fhirIdFor } from '../fhir-id.logic.js';
import { IDENTIFIER_SYSTEM_APPOINTMENT_ID } from '../fhir-systems.js';

const source = {
  id: 55,
  status: 'CONFIRMED',
  startTime: new Date('2026-07-10T14:00:00Z'),
  endTime: new Date('2026-07-10T14:30:00Z'),
  patientId: 42,
};

describe('toFhirEncounter', () => {
  it('mapea la cita confirmada', () => {
    const fhir = toFhirEncounter(source);

    expect(fhir.resourceType).toBe('Encounter');
    expect(fhir.status).toBe('planned');
    expect(fhir.class).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    });
    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_APPOINTMENT_ID, value: '55' },
    ]);
    expect(fhir.subject).toEqual({
      reference: `Patient/${fhirIdFor('Patient', 42)}`,
    });
    expect(fhir.period).toEqual({
      start: '2026-07-10T14:00:00.000Z',
      end: '2026-07-10T14:30:00.000Z',
    });
  });

  it.each([
    ['PENDING', 'planned'],
    ['CONFIRMED', 'planned'],
    ['IN_PROGRESS', 'in-progress'],
    ['COMPLETED', 'finished'],
    ['CANCELLED', 'cancelled'],
    ['NO_SHOW', 'cancelled'],
    ['ALGO_NUEVO', 'unknown'],
  ])('mapea status %s → %s', (domain, fhir) => {
    expect(toFhirEncounter({ ...source, status: domain }).status).toBe(fhir);
  });
});
