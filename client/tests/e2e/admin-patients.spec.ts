import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const patient = (id: number, name: string, lastName: string, overrides: Record<string, unknown> = {}) => ({
  id,
  emergencyContact: '+51912345678',
  bloodType: 'O+',
  allergies: null,
  chronicConditions: null,
  isActive: true,
  createdAt: '2026-09-01T15:00:00.000Z',
  profile: {
    id: 100 + id,
    name,
    lastName,
    email: `${name.toLowerCase()}@test.local`,
    phone: '+51987654321',
    birthday: '1990-05-12',
    gender: 'F',
    typeDocument: 'DNI',
    numberDocument: `4567891${id}`,
  },
  ...overrides,
});

const page1 = [patient(1, 'Ana', 'Torres'), patient(2, 'Bruno', 'Salazar', { isActive: false, bloodType: 'A-' })];
const paged = (rows: unknown[], currentPage = 1) => ({ rows, totalRows: 12, totalPages: 2, currentPage, activeCount: 9, inactiveCount: 3 });

const table = (page: Page) => page.getByRole('table', { name: 'Pacientes' });

test.describe('gestión de pacientes', () => {
  test.use({ actor: 'ADMIN' });

  let queries: URLSearchParams[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /patients', ({ query }: ApiRequest) => {
      queries.push(query);
      return query.get('currentPage') === '2' ? paged([patient(3, 'Carla', 'Gómez')], 2) : paged(page1);
    });
  });

  test('lista la página con sus conteos, busca y pagina en el servidor', async ({ page }) => {
    await page.goto('/patients', { timeout: 30_000 });

    await expect(page.locator('#main-content').getByRole('heading', { level: 1, name: 'Pacientes' })).toBeVisible();
    await expect(table(page).getByText('Ana Torres')).toBeVisible();
    await expect(table(page).getByRole('row', { name: /Bruno Salazar/ })).toContainText('Inactivo');
    await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('textbox', { name: 'Buscar paciente' }).fill('ana');
    await expect.poll(() => queries.at(-1)?.get('searchValue')).toBe('ana');

    await page.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect.poll(() => queries.at(-1)?.get('currentPage')).toBe('2');
    await expect(table(page).getByText('Carla Gómez')).toBeVisible();
  });

  test('filtrar por estado y ordenar por sangre se piden al servidor', async ({ page }) => {
    await page.goto('/patients', { timeout: 30_000 });
    await expect(table(page).getByText('Ana Torres')).toBeVisible();

    await page.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Inactivos' }).click();
    await expect.poll(() => queries.at(-1)?.get('isActive')).toBe('false');

    await table(page).getByRole('button', { name: 'Sangre' }).click();
    await expect.poll(() => `${queries.at(-1)?.get('orderBy')} ${queries.at(-1)?.get('orderByMode')}`).toBe('bloodType asc');
    await expect(table(page).getByRole('columnheader', { name: /Sangre/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  test('registrar desde el drawer envía el paciente y vuelve a pedir la lista', async ({ page, api }) => {
    let created: unknown;
    api.on('POST /patients', ({ body }: ApiRequest) => {
      created = body;
      return patient(9, 'Diego', 'Herrera');
    });

    await page.goto('/patients', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Registrar paciente' }).click();
    const drawer = page.getByRole('dialog', { name: 'Nuevo paciente' });
    await expect(drawer).toBeVisible();
    await expectAccessible(page);

    await drawer.getByLabel(/^Nombre/).fill('Diego');
    await drawer.getByLabel(/^Apellido/).fill('Herrera');
    await drawer.getByLabel('Email').fill('diego@test.local');
    await drawer.getByRole('combobox', { name: 'Tipo de documento' }).click();
    await page.getByRole('option', { name: 'DNI' }).click();
    await drawer.getByLabel(/^Número de documento/).fill('45678919');
    const emergency = drawer.getByLabel(/^Contacto de emergencia/);
    await emergency.click();
    await emergency.press('End');
    await emergency.pressSequentially('912345678');
    await drawer.getByRole('combobox', { name: 'Tipo de sangre' }).click();
    await page.getByRole('option', { name: 'O+' }).click();
    const before = queries.length;
    await drawer.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Paciente registrado')).toBeVisible();
    expect(created).toEqual({
      name: 'Diego',
      lastName: 'Herrera',
      email: 'diego@test.local',
      typeDocument: 'DNI',
      numberDocument: '45678919',
      emergencyContact: '+51912345678',
      bloodType: 'O+',
    });
    await expect.poll(() => queries.length).toBeGreaterThan(before);
  });

  test('cada fila lleva al expediente del paciente', async ({ page }) => {
    await page.goto('/patients', { timeout: 30_000 });

    await expect(table(page).getByRole('link', { name: 'Ver expediente de Ana Torres' })).toHaveAttribute('href', '/patients/1');
  });
});
