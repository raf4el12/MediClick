import { afterEach, describe, expect, it, vi } from 'vitest';
import { featuredDoctors, publicDirectoryService } from './public-directory.service';

const respond = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('publicDirectoryService', () => {
  it('pide al API interno, sin credenciales y con revalidación', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://api.interna:5000');
    const fetchMock = respond(200, { rows: [], totalRows: 0, currentPage: 1, totalPages: 0 });
    vi.stubGlobal('fetch', fetchMock);

    await publicDirectoryService.listDoctors({ specialtyId: 2, pageSize: 12 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { next?: { revalidate: number } }];
    expect(url).toBe('http://api.interna:5000/public/doctors?specialtyId=2&pageSize=12');
    expect(init.credentials).toBe('omit');
    expect(init.next).toEqual({ revalidate: 300 });
  });

  it('un médico inexistente devuelve null; otro error se propaga', async () => {
    vi.stubGlobal('fetch', respond(404));
    await expect(publicDirectoryService.getDoctor(999)).resolves.toBeNull();

    vi.stubGlobal('fetch', respond(500));
    await expect(publicDirectoryService.getDoctor(1)).rejects.toThrow();
  });
});

describe('featuredDoctors', () => {
  it('si el directorio no responde, la landing recibe una lista vacía', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))));

    await expect(featuredDoctors()).resolves.toEqual([]);
  });
});
