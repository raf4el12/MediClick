import { expectAccessible } from '../support/accessible';
import { expect, test } from '../support/fixtures';

test.describe('páginas de error', () => {
  test.use({ actor: 'PATIENT' });

  test('una ruta inexistente muestra el 404 con regreso al inicio del actor', async ({ page }) => {
    await page.goto('/no-existe');

    await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/patient');
    await expectAccessible(page);
  });

  test('una ruta sin permiso lleva al 401', async ({ page }) => {
    await page.goto('/payments');

    await expect(page).toHaveURL(/\/401$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'No tienes acceso' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/patient');
    await expectAccessible(page);
  });

  test('un fallo al cargar la página ofrece reintentar', async ({ page, api }) => {
    // Respuesta con una forma que la vista no espera: rompe el render.
    api.on('GET /appointments/my', { totalRows: 0, totalPages: 0, currentPage: 1, rows: null });

    await page.goto('/patient');

    await expect(page.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expectAccessible(page, { exclude: ['nextjs-portal'] });
  });
});
