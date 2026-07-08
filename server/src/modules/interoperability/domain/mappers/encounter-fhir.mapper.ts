import type { Encounter } from '@medplum/fhirtypes';
import { fhirIdFor } from '../fhir-id.logic.js';
import { IDENTIFIER_SYSTEM_APPOINTMENT_ID } from '../fhir-systems.js';

export interface EncounterProjectionSource {
  id: number;
  status: string;
  startTime: Date;
  endTime: Date;
  patientId: number;
}

const STATUS_MAP: Record<string, Encounter['status']> = {
  PENDING: 'planned',
  CONFIRMED: 'planned',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'finished',
  CANCELLED: 'cancelled',
  NO_SHOW: 'cancelled',
};

export function toFhirEncounter(source: EncounterProjectionSource): Encounter {
  return {
    resourceType: 'Encounter',
    status: STATUS_MAP[source.status] ?? 'unknown',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    },
    identifier: [
      { system: IDENTIFIER_SYSTEM_APPOINTMENT_ID, value: String(source.id) },
    ],
    subject: { reference: `Patient/${fhirIdFor('Patient', source.patientId)}` },
    period: {
      start: source.startTime.toISOString(),
      end: source.endTime.toISOString(),
    },
  };
}
