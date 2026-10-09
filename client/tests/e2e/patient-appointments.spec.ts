import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import { bookingRoutes } from './booking-fixtures';
import { page as paged, patientAppointments } from './patient-fixtures';

const MP_URL = 'https://www.mercadopago.test/checkout/102';
const { confirmed, pending, completed, cancelled } = patientAppointments;

/** Abre el panel de detalle de la cita cuya especialidad coincide. */
async function openDetail(page: Page, specialty: string) {
  await page.getByRole('button', { name: specialty }).first().click();
  const detail = page.getByRole('dialog', { name: 'Detalle de la cita' });
  await expect(detail).toBeVisible();
  return detail;
}

test.describe('mis citas', () => {
  test.use({ actor: 'PATIENT' });

  let queries: string[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /appointments/my', ({ query }: ApiRequest) => {
      queries.push(query.toString());
      if (query.get('upcoming') === 'true') return paged([confirmed, pending]);
      if (query.get('status') === 'COMPLETED') return paged([completed]);
      if (query.get('statuses')) return paged([cancelled]);
      return paged([confirmed, pending, completed, cancelled]);
    });
    api.on('GET /reviews/my', []);
  });

  test('las pestañas piden las citas con el filtro de cada una', async ({ page }) => {
    await page.goto('/patient/appointments');
    await expect(page.getByRole('heading', { level: 1, name: 'Mis citas' })).toBeVisible();
    await expect.poll(() => queries.at(-1)).toContain('upcoming=true');

    await page.getByRole('tab', { name: 'Todas' }).click();
    await expect.poll(() => queries.at(-1)).not.toMatch(/upcoming|status/);
    await page.getByRole('tab', { name: 'Completadas' }).click();
    await expect.poll(() => queries.at(-1)).toContain('status=COMPLETED');
    await page.getByRole('tab', { name: 'Canceladas' }).click();
    await expect.poll(() => queries.at(-1)).toContain('statuses=CANCELLED%2CNO_SHOW');
    await expectAccessible(page);
  });

  test('cancelar muestra la penalización exacta y refresca la lista', async ({ page, api }) => {
    let cancelBody: unknown;
    api.on('GET /appointments/:id/cancellation-preview', { fee: 45, currency: 'PEN', freeCancellationWindowHours: 24, hoursUntilAppointment: 20, cancellable: true });
    api.on('PATCH /appointments/:id/cancel', ({ body }: ApiRequest) => {
      cancelBody = body;
      return { ...confirmed, status: 'CANCELLED' };
    });

    await page.goto('/patient/appointments');
    const detail = await openDetail(page, 'Cardiología');
    await expectAccessible(page);
    await detail.getByRole('button', { name: 'Cancelar' }).click();

    const dialog = page.getByRole('dialog', { name: 'Cancelar la cita' });
    await expect(dialog.getByText(/penalización de S\/\s45\.00/)).toBeVisible();
    await expectAccessible(page);
    const loadsBefore = queries.length;
    await dialog.getByLabel('Motivo de la cancelación').fill('No puedo asistir');
    await dialog.getByRole('button', { name: 'Cancelar cita' }).click();

    await expect(page.getByText('Cita cancelada')).toBeVisible();
    expect(cancelBody).toEqual({ reason: 'No puedo asistir' });
    await expect.poll(() => queries.length).toBeGreaterThan(loadsBefore);
  });

  test('reagendar con el paso de cupo y un cupo tomado vuelve a mostrar los cupos', async ({ page, api }) => {
    for (const [key, fixture] of Object.entries(bookingRoutes())) api.on(key, fixture);
    let attempts = 0;
    let rescheduleBody: unknown;
    api.on('PATCH /appointments/:id/reschedule', ({ body }: ApiRequest) => {
      attempts += 1;
      rescheduleBody = body;
      return attempts === 1 ? reply(409, { message: 'El horario se superpone' }) : { ...confirmed };
    });

    await page.goto('/patient/appointments');
    const detail = await openDetail(page, 'Cardiología');
    await detail.getByRole('button', { name: 'Reagendar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reagendar la cita' });
    await dialog.getByRole('button', { name: '09:00' }).click();
    await dialog.getByRole('button', { name: 'Reagendar' }).click();

    await expect(dialog.getByText('El cupo elegido ya fue tomado')).toBeVisible();
    await expectAccessible(page);
    await dialog.getByRole('button', { name: '10:00' }).click();
    await dialog.getByRole('button', { name: 'Reagendar' }).click();

    await expect(page.getByText('Cita reagendada')).toBeVisible();
    expect(rescheduleBody).toEqual({ newScheduleId: 10, startTime: '10:00', endTime: '10:30' });
  });

  test('pagar lleva a Mercado Pago y un pago en proceso se explica', async ({ page, api }) => {
    let attempts = 0;
    api.on('POST /payments/preferences', () => {
      attempts += 1;
      return attempts === 1
        ? reply(400, { message: 'Ya existe una preferencia de pago pendiente para esta cita' })
        : { preferenceId: 'p', initPoint: MP_URL, sandboxInitPoint: MP_URL };
    });
    await page.route('https://www.mercadopago.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Mercado Pago simulado</h1>' }),
    );

    await page.goto('/patient/appointments');
    const detail = await openDetail(page, 'Cardiología'); // la primera es la confirmada
    await detail.getByRole('button', { name: 'Cerrar detalle' }).click();
    await page.getByRole('button', { name: 'Cardiología' }).nth(1).click();
    const pendingDetail = page.getByRole('dialog', { name: 'Detalle de la cita' });
    await pendingDetail.getByRole('button', { name: 'Pagar' }).click();

    await expect(page.getByText(/Tu pago está en proceso/)).toBeVisible();
    await pendingDetail.getByRole('button', { name: 'Pagar' }).click();
    await expect(page).toHaveURL(MP_URL);
  });

  test('reseñar una cita completada quita la acción', async ({ page, api }) => {
    let reviewed = false;
    api.on('GET /reviews/my', () => (reviewed ? [{ id: 1, appointmentId: 106, doctorId: 1, patientId: 100, rating: 5, comment: null, isVisible: true, patient: { name: 'Ana', lastName: 'Paciente' }, doctor: { name: 'Lucía', lastName: 'Paredes' }, createdAt: '2026-10-09T00:00:00Z' }] : []));
    api.on('POST /reviews', () => {
      reviewed = true;
      return { id: 1, appointmentId: 106, doctorId: 1, patientId: 100, rating: 5, comment: null, isVisible: true, patient: { name: 'Ana', lastName: 'Paciente' }, doctor: { name: 'Lucía', lastName: 'Paredes' }, createdAt: '2026-10-09T00:00:00Z' };
    });

    await page.goto('/patient/appointments');
    await page.getByRole('tab', { name: 'Completadas' }).click();
    const detail = await openDetail(page, 'Medicina General');
    await detail.getByRole('button', { name: 'Dejar reseña' }).click();
    const dialog = page.getByRole('dialog', { name: 'Calificar atención' });
    await dialog.locator('label').filter({ hasText: '5 estrellas' }).click();
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Enviar reseña' }).click();

    await expect(detail.getByRole('button', { name: 'Dejar reseña' })).toHaveCount(0);
  });

  test('la receta y el comprobante enlazan a sus vistas imprimibles', async ({ page }) => {
    await page.goto('/patient/appointments');
    await page.getByRole('tab', { name: 'Completadas' }).click();
    const detail = await openDetail(page, 'Medicina General');

    await expect(detail.getByRole('link', { name: 'Ver receta' })).toHaveAttribute('href', '/patient/appointments/106/receta');
    await expect(detail.getByRole('link', { name: 'Comprobante' })).toHaveAttribute('href', '/patient/appointments/106/comprobante');
  });

  test('el código de llegada se muestra en un diálogo', async ({ page, api }) => {
    api.on('GET /appointments/:id/check-in-qr', {
      appointmentId: 101,
      qrToken: 'mc_qr_token_de_prueba',
      opensAt: new Date(Date.now() + 3_600_000).toISOString(),
      expiresAt: new Date(Date.now() + 7_200_000).toISOString(),
    });

    await page.goto('/patient/appointments');
    const detail = await openDetail(page, 'Cardiología');
    await detail.getByRole('button', { name: 'Código de llegada' }).click();

    const dialog = page.getByRole('dialog', { name: 'Código de llegada' });
    await expect(dialog.getByRole('img', { name: 'Código QR de llegada' })).toBeVisible();
    await expectAccessible(page);
  });
});
