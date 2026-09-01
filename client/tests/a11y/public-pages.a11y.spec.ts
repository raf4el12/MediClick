import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .flatMap((node) => node.target)
        .map(String)
        .join(', ');

      return `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help} (${targets})`;
    })
    .join('\n');
}

for (const publicPage of publicPages) {
  test(`${publicPage.name} cumple WCAG 2.1 AA`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(publicPage.path, { waitUntil: 'domcontentloaded' });
    await publicPage.ready(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}
