import { expect, test } from '../support/fixtures';
import { expectAccessible } from '../support/accessible';

const notification = {
  id: 42,
  userId: 100,
  type: 'APPOINTMENT_REMINDER',
  channel: 'IN_APP',
  title: 'Recordatorio de cita',
  message: 'Tienes una cita mañana a las 10:00',
  isRead: false,
  metadata: null,
  sentAt: null,
  createdAt: new Date().toISOString(),
};

test.describe('portal del paciente', () => {
  test.use({ actor: 'PATIENT' });

  test('en escritorio usa el menú horizontal y no la barra inferior', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/patient');

    await expect(page.getByRole('link', { name: 'Reservar Cita' }).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeHidden();
    await expectAccessible(page);
  });

  test('en celular muestra la barra inferior con sus cuatro accesos', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/patient');

    const bottomNav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole('link')).toHaveText(['Inicio', 'Reservar Cita', 'Mis Citas', 'Mi Perfil']);
    await expectAccessible(page);
  });

  test('en /notifications conserva su propio shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/notifications');

    await expect(page.getByRole('link', { name: 'Mis Citas' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('el desplegable muestra las no leídas y marca una como leída', async ({ page, api }) => {
    const marked: number[] = [];
    api.on('GET /notifications/unread-count', { count: 1 });
    api.on('GET /notifications', { data: [notification], total: 1, page: 1, limit: 5, totalPages: 1 });
    api.on('PATCH /notifications/:id/read', ({ path }: { path: string }) => {
      marked.push(Number(path.split('/')[2]));
      return { ...notification, isRead: true };
    });

    await page.goto('/patient');
    const bell = page.getByRole('button', { name: 'Notificaciones, 1 sin leer' });
    await bell.click();
    await page.getByText('Recordatorio de cita').click();

    await expect.poll(() => marked).toEqual([42]);
    await expect(page.getByRole('button', { name: 'Notificaciones', exact: true })).toBeVisible();
  });
});

test.describe('personal de sede', () => {
  test.use({ actor: 'ADMIN' });

  test('usa el menú vertical con sus secciones', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Gestión Médica')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
    // El contenido del dashboard de administración se rediseña en la Fase 6 (UI-25):
    // hoy tiene barras de progreso sin nombre y leyendas con contraste insuficiente.
    await expectAccessible(page, { exclude: ['#main-content'] });
  });

  test('en /notifications conserva su propio shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/notifications');

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });
});
