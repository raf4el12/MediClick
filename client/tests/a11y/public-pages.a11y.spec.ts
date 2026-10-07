import { expect, test } from '../support/fixtures';
import { expectAccessible } from '../support/accessible';
import type { Page } from '@playwright/test';

type PublicPage = {
  name: string;
  path: string;
  ready: (page: Page) => Promise<void>;
};

const publicPages: PublicPage[] = [
  {
    name: 'página de inicio',
    path: '/',
    ready: async (page) => {
      const headline = page
        .getByText('Gestiona tus citas, pacientes y clínicas en', { exact: false })
        .first();
      await expect(headline).toBeVisible();
      await expect(headline.locator('..')).toHaveCSS('opacity', '1');
    },
  },
  {
    name: 'inicio de sesión',
    path: '/login',
    ready: async (page) => {
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    },
  },
];

for (const publicPage of publicPages) {
  test(`${publicPage.name} cumple WCAG 2.1 AA`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(publicPage.path, { waitUntil: 'domcontentloaded' });
    await publicPage.ready(page);

    await expectAccessible(page);
  });
}
