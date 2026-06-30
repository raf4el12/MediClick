import { toEntity, toVersion } from './fhir-resource.mapper.js';

describe('toEntity', () => {
  it('mapea una fila Prisma a la entidad de dominio', () => {
    const row = {
      id: 'uuid-1',
      resourceType: 'Patient',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      clinicId: 7,
      deleted: false,
      lastUpdated: new Date('2026-06-22T10:00:00.000Z'),
      createdAt: new Date('2026-06-20T08:00:00.000Z'),
    };

    expect(toEntity(row)).toEqual({
      id: 'uuid-1',
      resourceType: 'Patient',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      clinicId: 7,
      deleted: false,
      lastUpdated: new Date('2026-06-22T10:00:00.000Z'),
      createdAt: new Date('2026-06-20T08:00:00.000Z'),
    });
  });
});

describe('toVersion', () => {
  it('mapea una fila de historial a una versión de dominio', () => {
    const row = {
      resourceType: 'Patient',
      resourceId: 'uuid-1',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      recordedAt: new Date('2026-06-22T10:00:00.000Z'),
    };

    expect(toVersion(row)).toEqual({
      resourceType: 'Patient',
      resourceId: 'uuid-1',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      recordedAt: new Date('2026-06-22T10:00:00.000Z'),
    });
  });
});
