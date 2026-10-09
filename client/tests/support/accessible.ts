import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

type Violations = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];

function formatViolations(violations: Violations): string {
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

/**
 * Falla con la lista de violaciones WCAG 2.0/2.1 A y AA que encuentre axe.
 * `exclude` deja fuera zonas que todavía no se migraron (p. ej. el contenido de
 * una pantalla vieja al probar solo el shell).
 */
export async function expectAccessible(
  page: Page,
  options: { exclude?: string[] } = {},
): Promise<void> {
  // Un diálogo a medio fundido da colores intermedios: se espera a que terminen las
  // transiciones finitas (las infinitas, como un spinner, no terminan nunca).
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}
