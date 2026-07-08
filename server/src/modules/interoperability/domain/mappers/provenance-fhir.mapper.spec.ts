import { buildProvenance } from './provenance-fhir.mapper.js';

describe('buildProvenance', () => {
  it('referencia al recurso proyectado y registra el evento de origen', () => {
    const fhir = buildProvenance({
      targetType: 'Patient',
      targetFhirId: 'abc-123',
      eventName: 'patient.created',
      internalId: 42,
      recordedAt: new Date('2026-07-01T10:00:00Z'),
    });

    expect(fhir.resourceType).toBe('Provenance');
    expect(fhir.target).toEqual([{ reference: 'Patient/abc-123' }]);
    expect(fhir.recorded).toBe('2026-07-01T10:00:00.000Z');
    expect(fhir.activity).toEqual({ text: 'patient.created' });
    expect(fhir.agent).toEqual([
      { who: { display: 'MediClick' } },
    ]);
    expect(fhir.entity).toEqual([
      {
        role: 'source',
        what: { display: 'Patient interno id=42' },
      },
    ]);
  });
});
