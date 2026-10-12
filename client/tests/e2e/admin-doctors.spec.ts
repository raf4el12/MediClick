import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const doctor = (id: number, name: string, lastName: string, overrides: Record<string, unknown> = {}) => ({
  id,
  licenseNumber: `1234${id}`,
  resume: null,
  ratingAvg: null,
  ratingCount: 0,
  clinicId: 1,
  clinic: { id: 1, name: 'Sede Central' },
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  profile: { id: 100 + id, name, lastName, email: `${name.toLowerCase()}@test.local`, phone: '+51987654321', gender: 'F' },
  user: null,
  specialties: [{ id: 2, name: 'Cardiología' }],
  ...overrides,
});

const page = (rows: unknown[], totalRows = rows.length) => ({ totalRows, totalPages: Math.ceil(totalRows / 8), currentPage: 1, rows });

const specialties = page([
  { id: 1, name: 'Medicina General', description: null, duration: 20, price: 80, isActive: true, category: null },
  { id: 2, name: 'Cardiología', description: null, duration: 30, price: 150, isActive: true, category: null },
]);
const clinics = page([{ id: 1, name: 'Sede Central', timezone: 'America/Lima' }]);

test.describe('gestión de médicos', () => {
  test.use({ actor: 'ADMIN' });

  let queries: string[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /doctors', ({ query }: ApiRequest) => {
      queries.push(query.toString());
      return page([doctor(1, 'Lucía', 'Paredes'), doctor(2, 'Mario', 'Quispe', { isActive: false })], 20);
    });
    api.on('GET /specialties', specialties);
    api.on('GET /clinics', clinics);
  });

  test('lista los médicos de la página con su paginación de servidor', async ({ page: p }) => {
    await p.goto('/doctors', { timeout: 30_000 });

    const table = p.getByRole('table', { name: 'Médicos' });
    await expect(table.getByText('Lucía Paredes')).toBeVisible();
    await expect(table.getByText('Mario Quispe')).toBeVisible();
    await expect(p.getByText('1–8 de 20')).toBeVisible();
    await expectAccessible(p);

    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect.poll(() => queries.at(-1)).toContain('currentPage=2');
  });

  test('la búsqueda viaja al servidor como searchValue y vuelve a la página 1', async ({ page: p }) => {
    await p.goto('/doctors', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect.poll(() => queries.at(-1)).toContain('currentPage=2');

    await p.getByLabel('Buscar médico').fill('lucia');

    await expect.poll(() => queries.at(-1)).toContain('searchValue=lucia');
    expect(queries.at(-1)).toContain('currentPage=1');
  });

  test('ordenar por CMP pide el orden al servidor', async ({ page: p }) => {
    await p.goto('/doctors', { timeout: 30_000 });
    await p.getByRole('columnheader', { name: /CMP/ }).getByRole('button').click();

    await expect.poll(() => queries.at(-1)).toContain('orderBy=licenseNumber&orderByMode=asc');
  });

  test('registrar un médico desde el drawer envía el alta completa', async ({ page: p, api }) => {
    let body: unknown;
    api.on('POST /doctors/onboard', ({ body: b }: ApiRequest) => {
      body = b;
      return doctor(3, 'Sofía', 'Méndez');
    });

    await p.goto('/doctors', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Nuevo médico' }).click();
    const drawer = p.getByRole('dialog', { name: 'Nuevo médico' });
    await expect(drawer).toBeVisible();
    await drawer.getByLabel('Nombre de usuario').fill('Dra. Sofía Méndez');
    await drawer.getByLabel('Email').fill('sofia@test.local');
    await drawer.getByLabel('Contraseña').fill('secreta123');
    await drawer.getByLabel('Nombre', { exact: true }).fill('Sofía');
    await drawer.getByLabel('Apellido').fill('Méndez');
    await drawer.getByLabel('CMP (Colegio Médico)').fill('54321');
    await drawer.getByRole('combobox', { name: 'Sede' }).click();
    await p.getByRole('option', { name: /Sede Central/ }).click();
    await drawer.getByRole('combobox', { name: 'Especialidades' }).click();
    await p.getByRole('option', { name: 'Cardiología' }).click();
    await p.keyboard.press('Escape');
    await expectAccessible(p);
    await drawer.getByRole('button', { name: 'Registrar' }).click();

    await expect(p.getByText('Médico registrado')).toBeVisible();
    expect(body).toEqual({
      user: { name: 'Dra. Sofía Méndez', email: 'sofia@test.local', password: 'secreta123' },
      profile: { name: 'Sofía', lastName: 'Méndez' },
      cmp: '54321',
      clinicId: 1,
      specialtyIds: [2],
    });
  });

  test('eliminar pide confirmación y borra en el servidor', async ({ page: p, api }) => {
    let deleted = '';
    api.on('DELETE /doctors/:id', ({ path }: ApiRequest) => {
      deleted = path;
      return {};
    });

    await p.goto('/doctors', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Más acciones para Lucía Paredes' }).click();
    await p.getByRole('menuitem', { name: 'Eliminar' }).click();
    await p.getByRole('dialog', { name: '¿Eliminar médico?' }).getByRole('button', { name: 'Eliminar' }).click();

    await expect.poll(() => deleted).toBe('/doctors/1');
    await expect(p.getByText('Médico eliminado')).toBeVisible();
  });
});
