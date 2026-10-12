import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const categories = [
  { id: 1, name: 'Medicina', description: null, isActive: true },
  { id: 2, name: 'Cirugía', description: null, isActive: true },
];

const specialty = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  description: null,
  duration: 30,
  price: 150,
  requirements: null,
  icon: null,
  clinicId: 1,
  isActive: true,
  createdAt: '2026-01-10T00:00:00.000Z',
  category: { id: 1, name: 'Medicina' },
  ...overrides,
});

const page = (rows: unknown[], totalRows: number, currentPage = 1) => ({ rows, totalRows, totalPages: Math.ceil(totalRows / 8), currentPage });

test.describe('gestión de especialidades', () => {
  test.use({ actor: 'ADMIN' });

  let queries: URLSearchParams[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /categories', page(categories, 2));
    api.on('GET /clinics', page([{ id: 1, name: 'Sede Central', address: null, phone: null, email: null, timezone: 'America/Lima', currency: 'PEN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }], 1));
    api.on('GET /specialties', ({ query }: ApiRequest) => {
      queries.push(query);
      if (query.get('searchValue') === 'Derma') return page([specialty(5, 'Dermatología')], 1);
      if (query.get('categoryId') === '2') return page([specialty(6, 'Cirugía General', { category: { id: 2, name: 'Cirugía' } })], 1);
      if (query.get('currentPage') === '2') return page([specialty(9, 'Pediatría', { isActive: false })], 9, 2);
      return page([specialty(1, 'Cardiología'), specialty(2, 'Neurología', { clinicId: null, price: 220.5 })], 9);
    });
  });

  test('lista las especialidades con categoría, sede y precio, y pagina en el servidor', async ({ page: p }) => {
    await p.goto('/specialties', { timeout: 30_000 });

    const table = p.getByRole('table', { name: 'Especialidades' });
    await expect(table.getByText('Cardiología')).toBeVisible();
    await expect(table.getByText('Global')).toBeVisible();
    await expect(table.getByText('S/ 220.50')).toBeVisible();
    await expectAccessible(p);

    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect(table.getByText('Pediatría')).toBeVisible();
    await expect(table.getByText('Inactiva')).toBeVisible();
    expect(queries.at(-1)!.get('currentPage')).toBe('2');
  });

  test('buscar y filtrar por categoría se piden al servidor', async ({ page: p }) => {
    await p.goto('/specialties', { timeout: 30_000 });
    const table = p.getByRole('table', { name: 'Especialidades' });
    await expect(table.getByText('Cardiología')).toBeVisible();

    await p.getByRole('textbox', { name: 'Buscar especialidades' }).fill('Derma');
    await expect(table.getByText('Dermatología')).toBeVisible();
    expect(queries.at(-1)!.get('searchValue')).toBe('Derma');

    await p.getByRole('textbox', { name: 'Buscar especialidades' }).fill('');
    await p.getByRole('combobox', { name: 'Categoría' }).click();
    await p.getByRole('option', { name: 'Cirugía' }).click();
    await expect(table.getByText('Cirugía General')).toBeVisible();
    expect(queries.at(-1)!.get('categoryId')).toBe('2');
    expect(queries.at(-1)!.get('currentPage')).toBe('1');
  });

  test('crear una especialidad desde el drawer envía sus datos', async ({ page: p, api }) => {
    let created: unknown;
    api.on('POST /specialties', ({ body }: ApiRequest) => {
      created = body;
      return specialty(10, 'Dermatología');
    });

    await p.goto('/specialties', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Nueva especialidad' }).click();

    const drawer = p.getByRole('dialog', { name: 'Nueva especialidad' });
    await expect(drawer).toBeVisible();
    await expectAccessible(p);
    await drawer.getByLabel(/^Nombre/).fill('Dermatología');
    await drawer.getByRole('combobox', { name: /^Categoría/ }).click();
    await p.getByRole('option', { name: 'Medicina' }).click();
    await drawer.getByLabel(/^Precio/).fill('120');
    await drawer.getByRole('button', { name: 'Crear' }).click();

    await expect(p.getByText('Especialidad creada')).toBeVisible();
    expect(created).toEqual({ categoryId: 1, name: 'Dermatología', duration: 30, price: 120 });
  });

  test('eliminar pide confirmación antes de llamar al servidor', async ({ page: p, api }) => {
    let deleted = '';
    api.on('DELETE /specialties/:id', ({ path }: ApiRequest) => {
      deleted = path;
      return {};
    });

    await p.goto('/specialties', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Eliminar Cardiología' }).click();
    const confirm = p.getByRole('dialog', { name: 'Eliminar especialidad' });
    await confirm.getByRole('button', { name: 'Eliminar' }).click();

    await expect.poll(() => deleted).toBe('/specialties/1');
  });
});
