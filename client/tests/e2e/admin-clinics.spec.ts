import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const clinic = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  address: 'Av. Larco 1150, Miraflores',
  phone: '+5114445555',
  email: `sede${id}@mediclick.test`,
  timezone: 'America/Lima',
  currency: 'PEN',
  isActive: true,
  createdAt: '2026-01-10T00:00:00.000Z',
  ...overrides,
});

const page = (rows: unknown[], totalRows: number, currentPage = 1) => ({ rows, totalRows, totalPages: Math.ceil(totalRows / 8), currentPage });

test.describe('gestión de sedes', () => {
  test.use({ actor: 'ADMIN' });

  let queries: URLSearchParams[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /clinics', ({ query }: ApiRequest) => {
      queries.push(query);
      if (query.get('searchValue') === 'Norte') return page([clinic(3, 'Sede Norte')], 1);
      if (query.get('currentPage') === '2') return page([clinic(9, 'Sede Sur', { isActive: false })], 9, 2);
      return page([clinic(1, 'Sede Central'), clinic(2, 'Sede Miraflores', { currency: 'USD' })], 9);
    });
  });

  test('lista las sedes con su estado y pagina en el servidor', async ({ page: p }) => {
    await p.goto('/clinics', { timeout: 30_000 });

    const table = p.getByRole('table', { name: 'Sedes' });
    await expect(table.getByText('Sede Central')).toBeVisible();
    await expect(table.getByText('USD')).toBeVisible();
    expect(queries[0]!.get('currentPage')).toBe('1');
    await expectAccessible(p);

    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect(table.getByText('Sede Sur')).toBeVisible();
    await expect(table.getByText('Inactiva')).toBeVisible();
    expect(queries.at(-1)!.get('currentPage')).toBe('2');
  });

  test('buscar envía searchValue al servidor', async ({ page: p }) => {
    await p.goto('/clinics', { timeout: 30_000 });
    await expect(p.getByRole('table', { name: 'Sedes' }).getByText('Sede Central')).toBeVisible();

    await p.getByRole('textbox', { name: 'Buscar sedes' }).fill('Norte');

    await expect(p.getByRole('table', { name: 'Sedes' }).getByText('Sede Norte')).toBeVisible();
    expect(queries.at(-1)!.get('searchValue')).toBe('Norte');
    expect(queries.at(-1)!.get('currentPage')).toBe('1');
  });

  test('crear una sede desde el drawer envía sus datos', async ({ page: p, api }) => {
    let created: unknown;
    api.on('POST /clinics', ({ body }: ApiRequest) => {
      created = body;
      return clinic(10, 'Sede Norte');
    });

    await p.goto('/clinics', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Nueva sede' }).click();

    const drawer = p.getByRole('dialog', { name: 'Nueva sede' });
    await expect(drawer).toBeVisible();
    await expectAccessible(p);
    await drawer.getByLabel('Nombre').fill('Sede Norte');
    await drawer.getByLabel('Dirección').fill('Av. Túpac Amaru 400');
    await drawer.getByRole('button', { name: 'Crear' }).click();

    await expect(p.getByText('Sede creada')).toBeVisible();
    expect(created).toEqual({ name: 'Sede Norte', address: 'Av. Túpac Amaru 400', timezone: 'America/Lima', currency: 'PEN' });
  });

  test('eliminar pide confirmación antes de llamar al servidor', async ({ page: p, api }) => {
    let deleted = '';
    api.on('DELETE /clinics/:id', ({ path }: ApiRequest) => {
      deleted = path;
      return {};
    });

    await p.goto('/clinics', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Eliminar Sede Central' }).click();
    const confirm = p.getByRole('dialog', { name: 'Eliminar sede' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Eliminar' }).click();

    await expect.poll(() => deleted).toBe('/clinics/1');
  });
});
