import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const page = <T>(rows: T[]) => ({ totalRows: rows.length, totalPages: 1, currentPage: 1, rows });

const entry = (overrides: Record<string, unknown>) => ({
  id: 7,
  patientId: 100,
  patientName: 'Ana Torres',
  specialtyId: 2,
  specialtyName: 'Cardiología',
  doctorId: 12,
  doctorName: 'Lucía Paredes',
  clinicName: 'Sede Central',
  dateFrom: '2026-10-05T00:00:00.000Z',
  dateTo: '2026-10-20T00:00:00.000Z',
  timePreference: 'MORNING',
  priority: 10,
  status: 'ACTIVE',
  waitUntil: null,
  notes: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

const specialties = page([
  { id: 1, name: 'Medicina General' },
  { id: 2, name: 'Cardiología' },
]);
const doctors = page([{ id: 12, profile: { name: 'Lucía', lastName: 'Paredes' }, specialties: [{ id: 2, name: 'Cardiología' }] }]);

const main = (p: Page) => p.locator('#main-content');

test.describe('lista de espera del personal', () => {
  test.use({ actor: 'RECEPTIONIST' });

  let queries: string[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /specialties', specialties);
    api.on('GET /doctors', doctors);
    api.on('GET /waitlist', ({ query }: ApiRequest) => {
      queries.push(query.toString());
      return [entry({}), entry({ id: 8, patientName: 'Bruno Salazar', doctorId: null, doctorName: null, priority: 5, timePreference: 'ANY' })];
    });
  });

  test('muestra la cola en orden con su posición y filtra por especialidad', async ({ page: p }) => {
    await p.goto('/waitlist', { timeout: 30_000 });

    await expect(main(p).getByRole('heading', { level: 1, name: 'Lista de espera' })).toBeVisible();
    const table = p.getByRole('table', { name: 'Entradas en lista de espera' });
    await expect(table.getByRole('row').nth(1)).toContainText('1');
    await expect(table.getByRole('row').nth(1)).toContainText('Ana Torres');
    await expect(table.getByRole('row').nth(2)).toContainText('Bruno Salazar');
    await expect(table.getByRole('row').nth(2)).toContainText('Cualquiera');
    await expect(table.getByText('05 oct. 2026 – 20 oct. 2026').first()).toBeVisible();
    await expectAccessible(p);

    await p.getByRole('combobox', { name: 'Especialidad' }).click();
    await p.getByRole('option', { name: 'Cardiología' }).click();

    await expect.poll(() => queries.at(-1)).toBe('specialtyId=2');
  });

  test('subir la prioridad envía el valor elegido y vuelve a pedir la cola', async ({ page: p, api }) => {
    let patched: { path: string; body: unknown } | undefined;
    api.on('PATCH /waitlist/:id/priority', ({ path, body }: ApiRequest) => {
      patched = { path, body };
      return entry({ priority: 35 });
    });

    await p.goto('/waitlist', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Subir la prioridad de Ana Torres' }).click();
    const dialog = p.getByRole('dialog', { name: 'Subir prioridad' });
    await expect(dialog.getByText('Nueva prioridad: 20')).toBeVisible();
    await expectAccessible(p);

    const before = queries.length;
    await dialog.getByLabel('Sumar a la prioridad').fill('25');
    await dialog.getByRole('button', { name: 'Aplicar' }).click();

    await expect(p.getByText('Prioridad actualizada')).toBeVisible();
    expect(patched).toEqual({ path: '/waitlist/7/priority', body: { delta: 25 } });
    await expect.poll(() => queries.length).toBeGreaterThan(before);
  });
});
