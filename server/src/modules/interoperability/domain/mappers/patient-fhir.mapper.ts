import type { Patient } from '@medplum/fhirtypes';
import {
  IDENTIFIER_SYSTEM_DNI,
  IDENTIFIER_SYSTEM_PATIENT_ID,
} from '../fhir-systems.js';

export interface PatientProjectionSource {
  id: number;
  isActive: boolean;
  deleted: boolean;
  profile: {
    name: string;
    lastName: string;
    birthday: Date | null;
    gender: string | null;
    phone: string | null;
    address: string | null;
    typeDocument: string | null;
    numberDocument: string | null;
  };
}

const MALE_VALUES = new Set(['m', 'male', 'masculino']);
const FEMALE_VALUES = new Set(['f', 'female', 'femenino']);

function toFhirGender(raw: string | null): Patient['gender'] {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (MALE_VALUES.has(normalized)) return 'male';
  if (FEMALE_VALUES.has(normalized)) return 'female';
  return undefined;
}

export function toFhirPatient(source: PatientProjectionSource): Patient {
  const { profile } = source;

  const identifier: Patient['identifier'] = [];
  if (profile.numberDocument) {
    identifier.push({
      system: IDENTIFIER_SYSTEM_DNI,
      value: profile.numberDocument,
    });
  }
  identifier.push({
    system: IDENTIFIER_SYSTEM_PATIENT_ID,
    value: String(source.id),
  });

  return {
    resourceType: 'Patient',
    identifier,
    name: [{ family: profile.lastName, given: [profile.name] }],
    active: source.isActive && !source.deleted,
    ...(toFhirGender(profile.gender) && { gender: toFhirGender(profile.gender) }),
    ...(profile.birthday && {
      birthDate: profile.birthday.toISOString().slice(0, 10),
    }),
    ...(profile.phone && {
      telecom: [{ system: 'phone' as const, value: profile.phone }],
    }),
    ...(profile.address && { address: [{ text: profile.address }] }),
  };
}
