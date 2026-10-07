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

/** Falla con la lista de violaciones WCAG 2.0/2.1 A y AA que encuentre axe. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}
