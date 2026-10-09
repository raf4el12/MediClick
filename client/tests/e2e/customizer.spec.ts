import { expectAccessible } from '../support/accessible';
import { expect, test } from '../support/fixtures';

test.describe('personalización', () => {
  test.describe('personal', () => {
    test.use({ actor: 'ADMIN' });

    test('los ajustes de accesibilidad llegan al documento', async ({ page }) => {
      await page.goto('/dashboard');
      const toggler = page.getByRole('button', { name: 'Abrir personalización' });
      await toggler.click();
      await expect(toggler).toHaveAttribute('aria-expanded', 'true');

      await page.getByRole('switch', { name: 'Alto contraste' }).check();
      await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');

      await page.getByRole('button', { name: 'Tamaño de texto Grande' }).click();
      await expect(page.locator('html')).toHaveCSS('font-size', '18px');

      await page.getByRole('switch', { name: 'Reducir animaciones' }).check();
      await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

      await page.getByRole('button', { name: 'Menú colapsado' }).click();
      await expect(page.getByRole('button', { name: 'Menú colapsado' })).toHaveAttribute('aria-pressed', 'true');

      await expectAccessible(page, { exclude: ['#main-content'] });
    });
  });

  test.describe('paciente', () => {
    test.use({ actor: 'PATIENT' });

    test('no ofrece opciones del menú lateral', async ({ page }) => {
      await page.goto('/patient');
      await page.getByRole('button', { name: 'Abrir personalización' }).click();

      await expect(page.getByRole('button', { name: 'Tamaño de texto Grande' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Menú colapsado' })).toHaveCount(0);
      await expect(page.getByText('Semi Dark')).toHaveCount(0);
    });
  });
});
