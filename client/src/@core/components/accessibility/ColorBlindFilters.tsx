'use client';

/**
 * Filtros SVG para corrección/simulación de daltonismo.
 *
 * Las matrices son las recomendadas por la investigación de Brettel, Viénot
 * y Mollon (1997) para simular cómo perciben los colores las personas con
 * cada tipo de dicromatismo. Aquí se usan en modo "daltonización" — se
 * exageran los canales que el usuario no percibe bien para hacer la UI
 * distinguible (más útil que simular).
 *
 * Se aplican al <html> vía CSS: `filter: url(#cb-deuteranopia)`.
 */
export default function ColorBlindFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
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

        {/* Acromatopsia — escala de grises, para baja visión severa al color */}
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
    </svg>
  );
}
