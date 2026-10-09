import { describe, expect, it } from 'vitest';
import primaryColorConfig from './primaryColorConfig';

// Contraste WCAG 2.x entre dos colores #RRGGBB.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const WHITE = '#FFFFFF';
const BODY_BG = '#F4F5FA'; // background.default claro de Materio
const AA = 4.5;

describe('primaryColorConfig', () => {
  it('el primario por defecto es el violeta AA de ADR-0003', () => {
    expect(primaryColorConfig[0]?.main).toBe('#7E4EE6');
  });

  it.each(primaryColorConfig.map((c) => [c.name, c.main]))(
    '%s (%s) cumple AA con texto blanco y como texto sobre el fondo y el papel',
    (_name, main) => {
      expect(contrast(main, WHITE)).toBeGreaterThanOrEqual(AA);
      expect(contrast(main, BODY_BG)).toBeGreaterThanOrEqual(AA);
    },
  );
});
