import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const transaction = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  appointmentId: 101,
  amount: 150,
  currency: 'PEN',
  status: 'PAID',
  paymentMethod: 'CREDIT_CARD',
  gatewayId: 'mp-1',
  payerEmail: 'ana.paciente@test.local',
  failureReason: null,
  paidAt: '2026-10-08T15:00:00.000Z',
  clinicId: 1,
  createdAt: '2026-10-08T14:58:00.000Z',
  ...overrides,
});

const page1 = {
  data: [
    transaction(),
    transaction({ id: 2, appointmentId: 102, amount: 60, status: 'PARTIAL', paymentMethod: null, payerEmail: null }),
    transaction({ id: 3, appointmentId: 103, amount: 120, status: 'FAILED', currency: 'COP' }),
  ],
  total: 23,
  page: 1,
  totalPages: 3,
};

test.describe('pagos: el paciente no entra', () => {
  test.use({ actor: 'PATIENT' });

  test('un paciente que abre /payments vuelve a su inicio sin pedir las transacciones', async ({ page, api }) => {
    let asked = false;
    api.on('GET /payments', () => {
      asked = true;
      return page1;
    });

    await page.goto('/payments', { timeout: 30_000 });

    await expect(page).toHaveURL(/\/patient$/, { timeout: 15_000 });
    expect(asked).toBe(false);
  });
});

test.describe('pagos del personal', () => {
  test.use({ actor: 'ADMIN' });

  test('lista las transacciones con su moneda y filtra por estado, fechas y tamaño de página', async ({ page, api }) => {
    const queries: string[] = [];
    api.on('GET /payments', ({ query }: ApiRequest) => {
      queries.push(query.toString());
      return page1;
    });

    await page.goto('/payments', { timeout: 30_000 });

    const table = page.getByRole('table', { name: 'Transacciones de pago' });
    await expect(table.getByText('ana.paciente@test.local').first()).toBeVisible();
    await expect(table.getByText(/S\/\s150\.00/)).toBeVisible();
    await expect(table.getByText('Aprobada')).toBeVisible();
    await expect(table.getByText('Seña')).toBeVisible();
    await expect(table.getByText('Rechazada')).toBeVisible();
    // Cada transacción con su moneda: el peso colombiano va sin decimales.
    await expect(table.getByText(/^\$\s120$/)).toBeVisible();
    expect(queries[0]).toBe('page=1&limit=10');
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Aprobada' }).click();
    await expect.poll(() => queries.at(-1)).toBe('status=PAID&page=1&limit=10');

    await page.getByLabel('Desde').fill('2026-10-01');
    await page.getByLabel('Hasta').fill('2026-10-31');
    await expect.poll(() => queries.at(-1)).toBe('status=PAID&dateFrom=2026-10-01&dateTo=2026-10-31&page=1&limit=10');

    await page.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect.poll(() => queries.at(-1)).toContain('page=2&limit=10');

    await page.getByRole('combobox', { name: /Filas por página/ }).click();
    await page.getByRole('option', { name: '100' }).click();
    await expect.poll(() => queries.at(-1)).toContain('page=1&limit=100');
  });
});
