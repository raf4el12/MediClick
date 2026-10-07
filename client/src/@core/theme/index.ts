import type { ThemeOptions } from '@mui/material/styles';
import type {} from '@mui/material/themeCssVarsAugmentation';
import type {} from '@mui/lab/themeAugmentation';
import './types';
import overrides from './overrides';
import colorSchemes from './colorSchemes';
import spacing from './spacing';
import shadows from './shadows';
import customShadows from './customShadows';
import typography from './typography';
import type { Skin, SystemMode } from '@core/types';

interface ThemeSettings {
  skin: Skin;
  highContrast?: boolean;
}

type SchemePalette = Record<string, unknown>;

// Alto contraste (WCAG 1.4.6): texto, fondos y bordes puros en ambos esquemas.
// Con variables CSS el esquema activo lo elige el atributo data-light/data-dark,
// así que la transformación se aplica a los dos antes de crear el tema.
function highContrastPalette(palette: SchemePalette, isDark: boolean): SchemePalette {
  const pureText = isDark ? '#ffffff' : '#000000';
  return {
    ...palette,
    text: {
      primary: pureText,
      secondary: pureText,
      disabled: isDark ? '#9ca3af' : '#525252',
    },
    background: {
      default: isDark ? '#000000' : '#ffffff',
      paper: isDark ? '#0a0a0a' : '#ffffff',
    },
    divider: pureText,
    action: {
      ...((palette.action as Record<string, unknown> | undefined) ?? {}),
      active: pureText,
      hover: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      selected: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.16)',
      disabled: isDark ? '#6b7280' : '#525252',
    },
  };
}

const coreTheme = (
  settings: ThemeSettings,
  mode: SystemMode,
  fontFamily: string,
): ThemeOptions => {
  const schemes = colorSchemes(settings.skin) as unknown as {
    light: { palette: SchemePalette };
    dark: { palette: SchemePalette };
  };

  const resolvedSchemes = settings.highContrast
    ? {
        light: { ...schemes.light, palette: highContrastPalette(schemes.light.palette, false) },
        dark: { ...schemes.dark, palette: highContrastPalette(schemes.dark.palette, true) },
      }
    : schemes;

  return {
    components: overrides(settings.skin),
    colorSchemes: resolvedSchemes as ThemeOptions['colorSchemes'],
    ...spacing,
    shape: {
      borderRadius: 6,
      customBorderRadius: { xs: 2, sm: 4, md: 6, lg: 8, xl: 10 },
    },
    shadows: shadows(mode),
    typography: typography(fontFamily),
    customShadows: customShadows(mode),
    mainColorChannels: {
      light: '46 38 61',
      dark: '231 227 252',
      lightShadow: '46 38 61',
      darkShadow: '19 17 32',
    },
  } as ThemeOptions;
};

export default coreTheme;
