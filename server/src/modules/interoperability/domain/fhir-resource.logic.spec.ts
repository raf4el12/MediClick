import type { Resource } from '@medplum/fhirtypes';
import { nextVersionId, stampResource } from './fhir-resource.logic.js';

describe('nextVersionId', () => {
  it('arranca en 1 cuando no existe versión previa', () => {
    expect(nextVersionId(null)).toBe(1);
  });

  it('incrementa la versión existente', () => {
    expect(nextVersionId({ versionId: 2 })).toBe(3);
  });
});

describe('stampResource', () => {
  const lastUpdated = new Date('2026-06-22T10:00:00.000Z');

  it('sella id y meta.versionId/lastUpdated en el recurso', () => {
    const content = { resourceType: 'Patient' } as Resource;
    const result = stampResource(content, {
      id: 'abc-123',
      versionId: 4,
      lastUpdated,
    });

    expect(result.id).toBe('abc-123');
    expect(result.meta?.versionId).toBe('4');
    expect(result.meta?.lastUpdated).toBe('2026-06-22T10:00:00.000Z');
    expect(result.resourceType).toBe('Patient');
  });

  it('preserva meta existente y no muta el original', () => {
    const content = {
      resourceType: 'Patient',
      meta: { source: 'mediclick' },
    } as Resource;
    const result = stampResource(content, {
      id: 'x',
      versionId: 1,
      lastUpdated,
    });

    expect(result.meta?.source).toBe('mediclick');
    expect((content as { id?: string }).id).toBeUndefined();
  });
});
