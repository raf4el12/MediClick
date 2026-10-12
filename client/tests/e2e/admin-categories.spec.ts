import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const category = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  description: 'Atención clínica general',
  icon: 'ri-stethoscope-line',
  color: null,
  order: id,
  clinicId: null,
  isActive: true,
  createdAt: '2026-01-10T00:00:00.000Z',
  ...overrides,
});

const page = (rows: unknown[], totalRows: number, currentPage = 1) => ({ rows, totalRows, totalPages: Math.ceil(totalRows / 8), currentPage });

test.describe('gestión de categorías', () => {
  test.use({ actor: 'ADMIN' });

  let queries: URLSearchParams[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /clinics', page([{ id: 1, name: 'Sede Central', address: null, phone: null, email: null, timezone: 'America/Lima', currency: 'PEN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }], 1));
    api.on('GET /categories', ({ query }: ApiRequest) => {
      queries.push(query);
      if (query.get('searchValue') === 'Ciru') return page([category(3, 'Cirugía')], 1);
      if (query.get('currentPage') === '2') return page([category(9, 'Odontología', { isActive: false })], 9, 2);
      return page([category(1, 'Medicina'), category(2, 'Imágenes', { clinicId: 1, description: null })], 9);
    });
  });

  test('lista las categorías con su sede y pagina en el servidor', async ({ page: p }) => {
    await p.goto('/categories', { timeout: 30_000 });

    const table = p.getByRole('table', { name: 'Categorías' });
    await expect(table.getByText('Medicina')).toBeVisible();
    await expect(table.getByText('Global')).toBeVisible();
    await expect(table.getByText('Sede Central')).toBeVisible();
    await expectAccessible(p);

    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect(table.getByText('Odontología')).toBeVisible();
    await expect(table.getByText('Inactiva')).toBeVisible();
    expect(queries.at(-1)!.get('currentPage')).toBe('2');
  });

  test('buscar envía searchValue al servidor', async ({ page: p }) => {
    await p.goto('/categories', { timeout: 30_000 });
    const table = p.getByRole('table', { name: 'Categorías' });
    await expect(table.getByText('Medicina')).toBeVisible();

    await p.getByRole('textbox', { name: 'Buscar categorías' }).fill('Ciru');

    await expect(table.getByText('Cirugía')).toBeVisible();
    expect(queries.at(-1)!.get('searchValue')).toBe('Ciru');
    expect(queries.at(-1)!.get('currentPage')).toBe('1');
  });

  test('crear una categoría desde el drawer envía sus datos', async ({ page: p, api }) => {
    let created: unknown;
    api.on('POST /categories', ({ body }: ApiRequest) => {
      created = body;
      return category(10, 'Pediatría');
    });

    await p.goto('/categories', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Nueva categoría' }).click();

    const drawer = p.getByRole('dialog', { name: 'Nueva categoría' });
    await expect(drawer).toBeVisible();
    await expectAccessible(p);
    await drawer.getByLabel(/^Nombre/).fill('Pediatría');
    await drawer.getByLabel(/^Descripción/).fill('Atención de niños');
    await drawer.getByLabel(/^Orden/).fill('3');
    await drawer.getByRole('button', { name: 'Crear' }).click();

    await expect(p.getByText('Categoría creada')).toBeVisible();
    expect(created).toEqual({ name: 'Pediatría', description: 'Atención de niños', order: 3 });
  });

  test('eliminar pide confirmación antes de llamar al servidor', async ({ page: p, api }) => {
    let deleted = '';
    api.on('DELETE /categories/:id', ({ path }: ApiRequest) => {
      deleted = path;
      return {};
    });

    await p.goto('/categories', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Eliminar Medicina' }).click();
    const confirm = p.getByRole('dialog', { name: 'Eliminar categoría' });
    await confirm.getByRole('button', { name: 'Eliminar' }).click();

    await expect.poll(() => deleted).toBe('/categories/1');
  });
});
