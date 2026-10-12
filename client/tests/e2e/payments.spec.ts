import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
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

const appointment = {
  id: 101,
  patientId: 100,
  scheduleId: 10,
  startTime: '09:00',
  endTime: '09:30',
  reason: null,
  notes: null,
  status: 'COMPLETED',
  paymentStatus: 'PAID',
  amount: 150,
  cancelReason: null,
  cancellationFee: null,
  isOverbook: false,
  pendingUntil: null,
  patient: { id: 100, name: 'Ana', lastName: 'Paciente', email: 'ana.paciente@test.local' },
  schedule: {
    id: 10,
    scheduleDate: '2026-10-08T00:00:00.000Z',
    timeFrom: '08:00',
    timeTo: '12:00',
    doctor: { id: 1, name: 'Lucía', lastName: 'Paredes' },
    specialty: { id: 2, name: 'Cardiología' },
  },
  timezone: 'America/Lima',
  hasPrescription: false,
  notesCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  clinic: { id: 1, name: 'Sede Miraflores', address: 'Av. Larco 1150, Miraflores', currency: 'PEN' },
};

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

  test('solo una transacción aprobada enlaza al comprobante de su cita', async ({ page, api }) => {
    api.on('GET /payments', page1);

    await page.goto('/payments', { timeout: 30_000 });

    const table = page.getByRole('table', { name: 'Transacciones de pago' });
    await expect(table.getByRole('link', { name: 'Ver comprobante de la cita #101' })).toHaveAttribute('href', '/payments/101/comprobante');
    await expect(table.getByRole('link', { name: /Ver comprobante/ })).toHaveCount(1);
  });

  test('el comprobante del personal carga la cita de la sede y sus pagos aprobados', async ({ page, api }) => {
    const asked: string[] = [];
    api.on('GET /appointments/:id', ({ path }: ApiRequest) => {
      asked.push(path);
      return appointment;
    });
    api.on('GET /payments/appointment/:id/receipts', [transaction({ paidAt: '2026-10-08T15:00:00.000Z', gatewayId: 'MP-101' })]);

    await page.goto('/payments/101/comprobante', { timeout: 30_000 });

    await expect(page.getByRole('heading', { level: 1, name: 'Comprobante de pago' })).toBeVisible();
    await expect(page.getByText('Sede Miraflores')).toBeVisible();
    await expect(page.getByText('Ana Paciente')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'MP-101' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver a Pagos' })).toHaveAttribute('href', '/payments');
    expect(asked).toEqual(['/appointments/101']);
    await expectAccessible(page);
  });

  test('una cita de otra sede no muestra datos', async ({ page, api }) => {
    api.on('GET /appointments/:id', reply(404, { message: 'Cita no encontrada' }));

    await page.goto('/payments/999/comprobante', { timeout: 30_000 });

    await expect(page.getByText('No encontramos esta cita.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver a Pagos' })).toBeVisible();
  });
});
