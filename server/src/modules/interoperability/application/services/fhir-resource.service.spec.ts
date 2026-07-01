import type { Resource } from '@medplum/fhirtypes';
import { FhirResourceService } from './fhir-resource.service.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('FhirResourceService', () => {
  let repo: any;
  let service: FhirResourceService;

  beforeEach(() => {
    repo = {
      persist: jest.fn((input) =>
        Promise.resolve({ ...input, deleted: false, createdAt: new Date() }),
      ),
      findByTypeAndId: jest.fn(() => Promise.resolve(null)),
      findHistory: jest.fn(() => Promise.resolve([])),
      softDelete: jest.fn(() => Promise.resolve()),
    };
    service = new FhirResourceService(repo);
  });

  it('crea: genera UUID, versión 1 y sella el contenido', async () => {
    const content = { resourceType: 'Patient' } as Resource;
    await service.save({ resourceType: 'Patient', content, clinicId: 3 });

    expect(repo.findByTypeAndId).toHaveBeenCalledWith(
      'Patient',
      expect.stringMatching(UUID_RE),
    );
    const arg = repo.persist.mock.calls[0][0];
    expect(arg.versionId).toBe(1);
    expect(arg.clinicId).toBe(3);
    expect(arg.id).toMatch(UUID_RE);
    expect(arg.content.id).toBe(arg.id);
    expect(arg.content.meta.versionId).toBe('1');
  });

  it('actualiza: respeta el id dado e incrementa la versión', async () => {
    repo.findByTypeAndId.mockResolvedValueOnce({ versionId: 2 });
    const content = { resourceType: 'Patient' } as Resource;

    await service.save({
      id: 'fixed-id',
      resourceType: 'Patient',
      content,
      clinicId: 3,
    });

    expect(repo.findByTypeAndId).toHaveBeenCalledWith('Patient', 'fixed-id');
    const arg = repo.persist.mock.calls[0][0];
    expect(arg.id).toBe('fixed-id');
    expect(arg.versionId).toBe(3);
    expect(arg.content.meta.versionId).toBe('3');
  });

  it('getById delega en el repositorio', async () => {
    await service.getById('Patient', 'abc');
    expect(repo.findByTypeAndId).toHaveBeenCalledWith('Patient', 'abc');
  });

  it('getHistory delega en el repositorio', async () => {
    await service.getHistory('Patient', 'abc');
    expect(repo.findHistory).toHaveBeenCalledWith('Patient', 'abc');
  });
});
