import { toFhirPatient } from './patient-fhir.mapper.js';
import type { PatientProjectionSource } from './patient-fhir.mapper.js';
import {
  IDENTIFIER_SYSTEM_DNI,
  IDENTIFIER_SYSTEM_PATIENT_ID,
} from '../fhir-systems.js';

const fullSource: PatientProjectionSource = {
  id: 42,
  isActive: true,
  deleted: false,
  profile: {
    name: 'Ana',
    lastName: 'Díaz',
    birthday: new Date('1990-05-15T00:00:00Z'),
    gender: 'F',
    phone: '+51999888777',
    address: 'Av. Lima 123',
    typeDocument: 'DNI',
    numberDocument: '46871234',
  },
};

describe('toFhirPatient', () => {
  it('mapea el paciente completo', () => {
    const fhir = toFhirPatient(fullSource);

    expect(fhir.resourceType).toBe('Patient');
    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_DNI, value: '46871234' },
      { system: IDENTIFIER_SYSTEM_PATIENT_ID, value: '42' },
    ]);
    expect(fhir.name).toEqual([{ family: 'Díaz', given: ['Ana'] }]);
    expect(fhir.gender).toBe('female');
    expect(fhir.birthDate).toBe('1990-05-15');
    expect(fhir.telecom).toEqual([{ system: 'phone', value: '+51999888777' }]);
    expect(fhir.address).toEqual([{ text: 'Av. Lima 123' }]);
    expect(fhir.active).toBe(true);
  });

  it('omite campos opcionales nulos sin inventar defaults', () => {
    const fhir = toFhirPatient({
      id: 7,
      isActive: true,
      deleted: false,
      profile: {
        name: 'Luis',
        lastName: 'Paz',
        birthday: null,
        gender: null,
        phone: null,
        address: null,
        typeDocument: null,
        numberDocument: null,
      },
    });

    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_PATIENT_ID, value: '7' },
    ]);
    expect(fhir.gender).toBeUndefined();
    expect(fhir.birthDate).toBeUndefined();
    expect(fhir.telecom).toBeUndefined();
    expect(fhir.address).toBeUndefined();
  });

  it('no emite identifier DNI si falta typeDocument aunque haya numberDocument', () => {
    const fhir = toFhirPatient({
      ...fullSource,
      profile: { ...fullSource.profile, typeDocument: null },
    });

    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_PATIENT_ID, value: '42' },
    ]);
  });

  it.each([
    ['M', 'male'],
    ['MALE', 'male'],
    ['masculino', 'male'],
    ['F', 'female'],
    ['femenino', 'female'],
    ['no binario', undefined],
  ])('normaliza gender %s → %s', (raw, expected) => {
    const fhir = toFhirPatient({
      ...fullSource,
      profile: { ...fullSource.profile, gender: raw },
    });
    expect(fhir.gender).toBe(expected);
  });

  it('active=false si el paciente está borrado o inactivo', () => {
    expect(toFhirPatient({ ...fullSource, deleted: true }).active).toBe(false);
    expect(toFhirPatient({ ...fullSource, isActive: false }).active).toBe(false);
  });
});
