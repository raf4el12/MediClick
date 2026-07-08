import {
  uuidV5,
  fhirIdFor,
  provenanceIdFor,
} from './fhir-id.logic.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV5', () => {
  it('reproduce el vector conocido de RFC 4122 (namespace DNS, python.org)', () => {
    expect(uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
      '886313e1-3b8a-5372-9b90-0c9aee199e5d',
    );
  });
});

describe('fhirIdFor', () => {
  it('es determinístico: misma entidad, mismo id', () => {
    expect(fhirIdFor('Patient', 123)).toBe(fhirIdFor('Patient', 123));
  });

  it('distingue entidades y tipos', () => {
    expect(fhirIdFor('Patient', 1)).not.toBe(fhirIdFor('Patient', 2));
    expect(fhirIdFor('Patient', 1)).not.toBe(fhirIdFor('Encounter', 1));
  });

  it('produce UUID v5 con variante RFC válida', () => {
    expect(fhirIdFor('Patient', 123)).toMatch(UUID_RE);
  });
});

describe('provenanceIdFor', () => {
  it('difiere del id del recurso target', () => {
    expect(provenanceIdFor('Patient', 123)).not.toBe(fhirIdFor('Patient', 123));
  });

  it('es determinístico', () => {
    expect(provenanceIdFor('Encounter', 5)).toBe(provenanceIdFor('Encounter', 5));
  });
});
