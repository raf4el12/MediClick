import { expect, test } from '../support/fixtures';

test.describe('modo de color', () => {
  test.use({ actor: 'ADMIN' });

  test('el modo oscuro elegido se conserva al recargar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('i.ri-sun-line').first().click();
    await page.getByRole('menuitem', { name: /Oscuro/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-dark');

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-dark');
  });
});
