import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const review = (id: number, patient: [string, string], rating: number, overrides: Record<string, unknown> = {}) => ({
  id,
  appointmentId: 100 + id,
  doctorId: 12,
  patientId: 200 + id,
  rating,
  comment: 'Muy buena atención',
  isVisible: true,
  patient: { id: 200 + id, name: patient[0], lastName: patient[1] },
  doctor: { id: 12, name: 'Lucía', lastName: 'Paredes' },
  createdAt: '2026-10-05T15:00:00.000Z',
  ...overrides,
});

const doctors = {
  totalRows: 1,
  totalPages: 1,
  currentPage: 1,
  rows: [{ id: 12, profile: { name: 'Lucía', lastName: 'Paredes' }, specialties: [], clinicId: 1, isActive: true }],
};

const table = (page: Page) => page.getByRole('table', { name: 'Reseñas' });

test.describe('moderación de reseñas', () => {
  test.use({ actor: 'ADMIN' });

  let queries: URLSearchParams[];
  let hidden: boolean;

  test.beforeEach(({ api }) => {
    queries = [];
    hidden = false;
    api.on('GET /doctors', doctors);
    api.on('GET /reviews', ({ query }: ApiRequest) => {
      queries.push(query);
      const rows = [review(1, ['Ana', 'Torres'], 5, { isVisible: !hidden }), review(2, ['Bruno', 'Salazar'], 1, { isVisible: false, comment: 'Lenguaje ofensivo' })];
      return { rows, totalRows: 2, totalPages: 1, currentPage: 1 };
    });
  });

  test('lista las reseñas de la sede y filtra por estado, calificación y médico en el servidor', async ({ page }) => {
    await page.goto('/reviews', { timeout: 30_000 });

    await expect(page.locator('#main-content').getByRole('heading', { level: 1, name: 'Reseñas' })).toBeVisible();
    await expect(table(page).getByRole('row', { name: /Ana Torres/ })).toContainText('Visible');
    await expect(table(page).getByRole('row', { name: /Bruno Salazar/ })).toContainText('Reseña oculta');
    await expect(table(page).getByRole('row', { name: /Ana Torres/ }).getByRole('img', { name: '5 de 5 estrellas' })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Ocultas' }).click();
    await expect.poll(() => queries.at(-1)?.get('isVisible')).toBe('false');

    await page.getByRole('combobox', { name: 'Calificación' }).click();
    await page.getByRole('option', { name: '1 estrella' }).click();
    await expect.poll(() => queries.at(-1)?.get('rating')).toBe('1');

    await page.getByRole('combobox', { name: 'Médico' }).click();
    await page.getByRole('option', { name: 'Lucía Paredes' }).click();
    await expect.poll(() => queries.at(-1)?.get('doctorId')).toBe('12');
  });

  test('ocultar una reseña pide confirmación, envía la visibilidad y refresca la lista', async ({ page, api }) => {
    let body: unknown;
    api.on('PATCH /reviews/:id/visibility', ({ body: b }: ApiRequest) => {
      body = b;
      hidden = true;
      return review(1, ['Ana', 'Torres'], 5, { isVisible: false });
    });

    await page.goto('/reviews', { timeout: 30_000 });
    await table(page).getByRole('button', { name: 'Ocultar la reseña de Ana Torres' }).click();
    const confirm = page.getByRole('dialog', { name: 'Ocultar la reseña' });
    await expectAccessible(page);
    await confirm.getByRole('button', { name: 'Ocultar' }).click();

    await expect(page.getByText('Reseña ocultada')).toBeVisible();
    expect(body).toEqual({ isVisible: false });
    await expect(table(page).getByRole('row', { name: /Ana Torres/ })).toContainText('Reseña oculta');
  });

  test('mostrar una reseña oculta envía isVisible true', async ({ page, api }) => {
    let body: unknown;
    api.on('PATCH /reviews/:id/visibility', ({ body: b }: ApiRequest) => {
      body = b;
      return review(2, ['Bruno', 'Salazar'], 1);
    });

    await page.goto('/reviews', { timeout: 30_000 });
    await table(page).getByRole('button', { name: 'Mostrar la reseña de Bruno Salazar' }).click();
    await page.getByRole('dialog', { name: 'Mostrar la reseña' }).getByRole('button', { name: 'Mostrar' }).click();

    await expect.poll(() => body).toEqual({ isVisible: true });
  });
});

test.describe('moderación de reseñas para el paciente', () => {
  test.use({ actor: 'PATIENT' });

  test('el paciente no entra ni pide el listado de moderación', async ({ page }) => {
    await page.goto('/reviews', { timeout: 30_000 });

    await expect(page).toHaveURL(/\/patient$/, { timeout: 15_000 });
  });
});
