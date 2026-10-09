import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import { bookingRoutes } from './booking-fixtures';

const MP_URL = 'https://www.mercadopago.test/checkout/777';

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  patientId: 100,
  patientName: 'Ana Paciente',
  specialtyId: 2,
  specialtyName: 'Cardiología',
  doctorId: 1,
  doctorName: 'Lucía Paredes',
  clinicName: 'Sede Miraflores',
  dateFrom: '2026-10-20T00:00:00.000Z',
  dateTo: '2026-10-30T00:00:00.000Z',
  timePreference: 'MORNING',
  priority: 0,
  status: 'ACTIVE',
  waitUntil: '2026-10-31T00:00:00.000Z',
  notes: null,
  createdAt: '2026-10-19T00:00:00.000Z',
  ...overrides,
});

const offer = (secondsLeft: number) => ({
  id: 9,
  waitlistEntryId: 5,
  scheduleId: 12,
  specialtyName: 'Cardiología',
  scheduleDate: '2026-10-22',
  doctorName: 'Lucía Paredes',
  clinic: { id: 1, name: 'Sede Miraflores', timezone: 'America/Lima' },
  startTime: '09:00',
  endTime: '09:30',
  expiresAt: new Date(Date.now() + secondsLeft * 1000).toISOString(),
  status: 'PENDING',
  secondsRemaining: secondsLeft,
});

test.describe('lista de espera del paciente', () => {
  test.use({ actor: 'PATIENT' });

  test.beforeEach(({ api }) => {
    api.on('GET /waitlist/my', [entry()]);
    api.on('GET /waitlist/my/offers', [offer(600)]);
  });

  test('las entradas y la oferta de cupo muestran sus datos completos', async ({ page }) => {
    await page.goto('/patient/waitlist');

    const entryCard = page.getByRole('article', { name: /Cardiología/ }).filter({ hasText: 'Entrada' });
    await expect(entryCard.getByText('Lucía Paredes')).toBeVisible();
    await expect(entryCard.getByText('Sede Miraflores')).toBeVisible();
    await expect(entryCard.getByText(/20 de octubre.*30 de octubre/)).toBeVisible();
    await expect(entryCard.getByText(/Mañana/)).toBeVisible();

    const offerCard = page.getByRole('article', { name: /Oferta de cupo/ });
    await expect(offerCard.getByText(/jueves, 22 de octubre/i)).toBeVisible();
    await expect(offerCard.getByText('09:00 a 09:30 (hora de la sede)')).toBeVisible();
    await expect(offerCard.getByText(/Lucía Paredes · Sede Miraflores/)).toBeVisible();
    await expect(offerCard.getByText(/Vence en 9:5\d|Vence en 10:00/)).toBeVisible();
    await expectAccessible(page);
  });

  test('al vencer, la oferta se deshabilita y se vuelve a pedir', async ({ page, api }) => {
    let offerLoads = 0;
    // Hasta que corre el job de expiración, el servidor la sigue devolviendo ya vencida.
    api.on('GET /waitlist/my/offers', () => {
      offerLoads += 1;
      return [offer(offerLoads === 1 ? 2 : -1)];
    });

    await page.goto('/patient/waitlist');
    await expect(page.getByRole('button', { name: 'Aceptar oferta' })).toBeEnabled();

    await expect(page.getByText('La oferta venció')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Aceptar oferta' })).toBeDisabled();
    await expect.poll(() => offerLoads).toBeGreaterThan(1);
  });

  test('aceptar la oferta lleva a pagar en Mercado Pago', async ({ page, api }) => {
    let preferenceFor: unknown;
    api.on('POST /waitlist/offers/:id/accept', { appointmentId: 777, scheduleId: 12, startTime: '09:00', endTime: '09:30', status: 'PENDING', paymentStatus: 'PENDING', amount: 150, pendingUntil: null });
    api.on('POST /payments/preferences', ({ body }: ApiRequest) => {
      preferenceFor = body;
      return { preferenceId: 'p', initPoint: MP_URL, sandboxInitPoint: MP_URL };
    });
    await page.route('https://www.mercadopago.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Mercado Pago simulado</h1>' }),
    );

    await page.goto('/patient/waitlist');
    await page.getByRole('button', { name: 'Aceptar oferta' }).click();

    await expect(page).toHaveURL(MP_URL);
    expect(preferenceFor).toEqual({ appointmentId: 777 });
  });

  test('una oferta ya tomada avisa y se refresca', async ({ page, api }) => {
    let offerLoads = 0;
    api.on('GET /waitlist/my/offers', () => {
      offerLoads += 1;
      return offerLoads === 1 ? [offer(600)] : [];
    });
    api.on('POST /waitlist/offers/:id/accept', reply(409, { message: 'La oferta ya no está disponible' }));

    await page.goto('/patient/waitlist');
    await page.getByRole('button', { name: 'Aceptar oferta' }).click();

    await expect(page.getByText('La oferta ya no está disponible')).toBeVisible();
    await expect(page.getByRole('article', { name: /Oferta de cupo/ })).toHaveCount(0);
  });

  test('rechazar la oferta la quita', async ({ page, api }) => {
    let offerLoads = 0;
    api.on('GET /waitlist/my/offers', () => {
      offerLoads += 1;
      return offerLoads === 1 ? [offer(600)] : [];
    });
    api.on('POST /waitlist/offers/:id/reject', {});

    await page.goto('/patient/waitlist');
    await page.getByRole('button', { name: 'Rechazar' }).click();

    await expect(page.getByRole('article', { name: /Oferta de cupo/ })).toHaveCount(0);
  });

  test('unirse sin médico pide la sede y la envía', async ({ page, api }) => {
    for (const [key, fixture] of Object.entries(bookingRoutes())) api.on(key, fixture);
    let joined: unknown;
    api.on('POST /waitlist', ({ body }: ApiRequest) => {
      joined = body;
      return entry({ id: 6, doctorId: null, doctorName: null });
    });

    await page.goto('/patient/waitlist');
    await page.getByRole('button', { name: 'Unirme a la lista' }).click();
    const dialog = page.getByRole('dialog', { name: 'Unirse a la lista de espera' });
    await dialog.getByRole('combobox', { name: 'Especialidad' }).click();
    await page.getByRole('option', { name: 'Cardiología' }).click();
    await dialog.getByRole('button', { name: 'Unirme a la lista' }).click();
    await expect(dialog.getByText('Elige la sede donde quieres atenderte o un médico')).toBeVisible();
    await expectAccessible(page);

    await dialog.getByRole('combobox', { name: 'Sede' }).click();
    await page.getByRole('option', { name: 'Sede Miraflores' }).click();
    await dialog.getByRole('button', { name: 'Unirme a la lista' }).click();

    await expect(dialog).toBeHidden();
    expect(joined).toMatchObject({ specialtyId: 2, clinicId: 1 });
    expect(joined).not.toHaveProperty('doctorId');
  });

  test('salir de la lista pide confirmación', async ({ page, api }) => {
    let deleted = '';
    api.on('DELETE /waitlist/:id', ({ path }: ApiRequest) => {
      deleted = path;
      return {};
    });

    await page.goto('/patient/waitlist');
    await page.getByRole('button', { name: 'Salir de la lista' }).click();
    const confirm = page.getByRole('dialog', { name: 'Salir de la lista de espera' });
    await expect(confirm).toBeVisible();
    await expectAccessible(page);
    await confirm.getByRole('button', { name: 'Salir de la lista' }).click();

    await expect.poll(() => deleted).toBe('/waitlist/5');
  });
});
