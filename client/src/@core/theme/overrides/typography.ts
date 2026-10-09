// MUI Imports
import type { Theme } from '@mui/material/styles'

// Desviación de Materio (ADR-0003): sus variantes fuerzan un color por variante
// (encabezados text.primary, body text.secondary, caption text.disabled). Eso
// pisa el color heredado en paneles y banners de color de las pantallas que aún
// no se migraron, y caption con text.disabled no cumple WCAG AA. Hasta migrarlas,
// el texto hereda el color y cada vista lo fija con `color` cuando lo necesita.
const typography: Theme['components'] = {
  MuiTypography: {
    styleOverrides: {
      root: {
        variants: [
          {
            props: { variant: 'caption' },
            style: { display: 'inline-block' }
          },
          {
            props: { variant: 'overline' },
            style: { display: 'inline-block' }
          }
        ]
      },
      gutterBottom: ({ theme }) => ({
        marginBottom: theme.spacing(2)
      })
    }
  }
}

export default typography
