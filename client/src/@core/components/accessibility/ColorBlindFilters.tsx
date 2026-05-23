'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Filtros SVG para corrección de daltonismo.
 *
 * Las matrices son las de Brettel/Viénot/Mollon (1997).
 *
 * Se renderizan vía Portal directamente al <html>, FUERA del wrapper
 * .accessibility-root que recibe `filter: url(#cb-X)`. Así el propio SVG
 * de defs no queda dentro del filtro (lo cual rompe Recharts y crea
 * problemas de renderizado en cadena).
 */
export default function ColorBlindFilters() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <svg
      aria-hidden="true"
      focusable="false"
      data-cb-filters
      style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <defs>
        {/* Protanopia — refuerza el rojo perdido */}
        <filter id="cb-protanopia">
          <feColorMatrix
            type="matrix"
            values="0.567, 0.433, 0,     0, 0
                    0.558, 0.442, 0,     0, 0
                    0,     0.242, 0.758, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Deuteranopia — refuerza el verde perdido (más común: ~6% hombres) */}
        <filter id="cb-deuteranopia">
          <feColorMatrix
            type="matrix"
            values="0.625, 0.375, 0,   0, 0
                    0.7,   0.3,   0,   0, 0
                    0,     0.3,   0.7, 0, 0
                    0,     0,     0,   1, 0"
          />
        </filter>

        {/* Tritanopia — refuerza el azul perdido */}
        <filter id="cb-tritanopia">
          <feColorMatrix
            type="matrix"
            values="0.95,  0.05, 0,     0, 0
                    0,     0.433, 0.567, 0, 0
                    0,     0.475, 0.525, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Acromatopsia — escala de grises */}
        <filter id="cb-achromatopsia">
          <feColorMatrix
            type="matrix"
            values="0.299, 0.587, 0.114, 0, 0
                    0.299, 0.587, 0.114, 0, 0
                    0.299, 0.587, 0.114, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>
      </defs>
    </svg>,
    document.body,
  );
}
