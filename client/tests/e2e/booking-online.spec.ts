import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import { bookingRoutes, dayLabel, dayWithoutSlots, firstDay } from './booking-fixtures';

const MP_URL = 'https://www.mercadopago.test/checkout/501';

const next = (page: Page) => page.getByRole('button', { name: /^Siguiente/ }).click();

async function chooseDoctor(page: Page, doctor = /Lucía Paredes/) {
  await page.getByRole('radio', { name: /Sede Miraflores/ }).check();
  await next(page);
  await page.getByRole('radio', { name: /Cardiología/ }).check();
  await next(page);
  await page.getByRole('radio', { name: doctor }).check();
  await next(page);
}

test.describe('reserva en línea', () => {
  test.use({ actor: 'PATIENT' });

  test.beforeEach(({ api }) => {
    for (const [key, fixture] of Object.entries(bookingRoutes())) api.on(key, fixture);
  });

  test('camino feliz: de la sede al pago con la moneda de la sede', async ({ page, api }) => {
    const sent: Record<string, unknown> = {};
    api.on('POST /appointments/patient', ({ body }: ApiRequest) => {
      sent.appointment = body;
      return { id: 501 };
    });
    api.on('POST /payments/preferences', ({ body }: ApiRequest) => {
      sent.preference = body;
      return { preferenceId: 'pref-501', initPoint: MP_URL, sandboxInitPoint: MP_URL };
    });
    await page.route('https://www.mercadopago.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Mercado Pago simulado</h1>' }),
    );

    await page.goto('/patient/book');
    await expect(page.getByRole('radio', { name: /Sede Miraflores/ })).toBeVisible();
    await expectAccessible(page);
    await chooseDoctor(page);

    // El primer día con cupos queda elegido; se elige la hora.
    await expect(page.getByRole('option', { name: new RegExp(dayLabel(firstDay)) })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: '09:30' })).toBeDisabled();
    await page.getByRole('button', { name: '09:00' }).click();
    await expectAccessible(page);
    await next(page);

    await expect(page.getByText('S/ 150.00')).toBeVisible();
    await expect(page.getByText(/15 minutos/)).toBeVisible();
    await page.getByLabel('Motivo de la consulta (opcional)').fill('Control anual');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Confirmar y pagar' }).click();

    await expect(page).toHaveURL(MP_URL);
    expect(sent.appointment).toEqual({ scheduleId: 10, startTime: '09:00', endTime: '09:30', reason: 'Control anual' });
    expect(sent.preference).toEqual({ appointmentId: 501 });
  });

  test('los días sin cupos no se eligen y un médico sin cupos ofrece la lista de espera', async ({ page }) => {
    await page.goto('/patient/book');
    await chooseDoctor(page);

    await expect(page.getByRole('option', { name: new RegExp(dayLabel(dayWithoutSlots)) })).toHaveAttribute('aria-disabled', 'true');
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(page.getByText('No hay cupos este mes')).toBeVisible();

    await page.getByRole('button', { name: 'Atrás' }).click();
    await page.getByRole('radio', { name: /Sofía Méndez/ }).check();
    await next(page);
    await expect(page.getByRole('button', { name: 'Unirme a la lista de espera' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Elegir otro médico' }).click();
    await expect(page.getByRole('radio', { name: /Lucía Paredes/ })).toBeVisible();
  });

  test('si el cupo ya fue tomado vuelve a elegir cupo y recarga las horas', async ({ page, api }) => {
    let slotLoads = 0;
    api.on('GET /schedules/time-slots', () => {
      slotLoads += 1;
      return bookingRoutes()['GET /schedules/time-slots'];
    });
    api.on('POST /appointments/patient', reply(409, { message: 'El horario se superpone con otra cita' }));

    await page.goto('/patient/book');
    await chooseDoctor(page);
    await page.getByRole('button', { name: '09:00' }).click();
    await next(page);
    const loadsBefore = slotLoads;
    await page.getByRole('button', { name: 'Confirmar y pagar' }).click();

    await expect(page.getByText('El cupo elegido ya fue tomado')).toBeVisible();
    await expect(page.getByRole('button', { name: '09:00' })).toBeVisible();
    await expect.poll(() => slotLoads).toBeGreaterThan(loadsBefore);
  });

  test('cambiar de médico limpia el día y el cupo', async ({ page }) => {
    await page.goto('/patient/book');
    await chooseDoctor(page);
    await page.getByRole('button', { name: '09:00' }).click();

    await page.getByRole('button', { name: 'Atrás' }).click();
    await page.getByRole('radio', { name: /Martín Fernández/ }).check();
    await next(page);

    await expect(page.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: /^Siguiente/ })).toBeDisabled();
  });

  test('un preset por URL salta a elegir el cupo y uno inválido empieza por el primer paso sin resolver', async ({ page }) => {
    await page.goto('/patient/book?doctorId=4');
    await expect(page.getByRole('button', { name: '09:00' })).toBeVisible();
    await expect(page.getByText('Martín Fernández')).toBeVisible();

    await page.goto('/patient/book?doctorId=999');
    await expect(page.getByRole('radio', { name: /Sede Miraflores/ })).toBeVisible();

    await page.goto('/patient/book?doctorId=4&specialtyId=1');
    await expect(page.getByRole('heading', { name: 'Elige a tu médico' })).toBeVisible();
  });

  test('en celular las acciones quedan fijas sobre la barra inferior', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/patient/book');
    await page.getByRole('radio', { name: /Sede Miraflores/ }).check();

    const actions = page.getByRole('button', { name: /^Siguiente/ });
    await expect(actions).toBeInViewport();
    await expectAccessible(page);
  });
});

test.describe('reserva en línea sin sesión', () => {
  test('el preset sobrevive al inicio de sesión', async ({ page }) => {
    await page.goto('/patient/book?doctorId=5');

    await expect(page).toHaveURL(/\/login\?from=%2Fpatient%2Fbook%3FdoctorId%3D5$/);
  });
});
