import { expectAccessible } from '../support/accessible';
import { expect, test } from '../support/fixtures';
import { page as paged, patientAppointments, summary } from './patient-fixtures';

test.describe('inicio del paciente', () => {
  test.use({ actor: 'PATIENT' });

  test.beforeEach(({ api }) => {
    api.on('GET /appointments/my/summary', summary());
    api.on('GET /appointments/my', paged([patientAppointments.completed, patientAppointments.cancelled]));
    api.on('GET /waitlist/my/offers', []);
    api.on('GET /reviews/my', []);
  });

  test('saluda, resume las citas y destaca la próxima con su sede y hora local', async ({ page }) => {
    await page.goto('/patient');

    await expect(page.getByRole('heading', { level: 1, name: /Hola, Ana/ })).toBeVisible();
    const stats = page.getByRole('region', { name: 'Resumen de tus citas' });
    await expect(stats.getByText('Próximas citas')).toBeVisible();
    await expect(stats.getByText('3', { exact: true })).toBeVisible();
    await expect(stats.getByText(/La primera vence en 1[12] min/)).toBeVisible();
    await expect(stats.getByText('8', { exact: true })).toBeVisible();

    const next = page.getByRole('region', { name: 'Tu próxima cita' });
    await expect(next.getByText('Cardiología con Lucía Paredes')).toBeVisible();
    await expect(next.getByText(/Sede Miraflores · Av\. Larco 1150/)).toBeVisible();
    await expect(next.getByText(/10:30 \(hora de la sede\)/)).toBeVisible();
    await expect(next.getByRole('button', { name: 'Código de llegada' })).toBeVisible();

    await expect(page.locator('#main-content').getByRole('link', { name: 'Reservar cita' })).toHaveAttribute('href', '/patient/book');
    await expect(page.getByRole('link', { name: 'Ver todas mis citas' })).toHaveAttribute('href', '/patient/appointments');
    await expectAccessible(page);
  });

  test('una oferta de cupo vigente aparece como aviso', async ({ page, api }) => {
    api.on('GET /waitlist/my/offers', [
      {
        id: 9,
        waitlistEntryId: 5,
        scheduleId: 12,
        specialtyName: 'Dermatología',
        scheduleDate: '2026-10-22',
        doctorName: 'Camila Rojas',
        clinic: { id: 1, name: 'Sede Miraflores', timezone: 'America/Lima' },
        startTime: '08:00',
        endTime: '08:20',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        status: 'PENDING',
        secondsRemaining: 600,
      },
    ]);

    await page.goto('/patient');

    await expect(page.getByText(/Tienes una oferta de cupo para Dermatología/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver oferta' })).toHaveAttribute('href', '/patient/waitlist');
  });

  test('sin próxima cita invita a reservar', async ({ page, api }) => {
    api.on('GET /appointments/my/summary', summary({ nextAppointment: null, upcomingCount: 0 }));

    await page.goto('/patient');

    await expect(page.getByText('No tienes citas próximas.')).toBeVisible();
  });

  test('en celular se lee completo y accesible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/patient');

    await expect(page.getByRole('region', { name: 'Tu próxima cita' })).toBeVisible();
    await expectAccessible(page);
  });
});
