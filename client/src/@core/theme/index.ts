import type { ThemeOptions } from '@mui/material/styles';
import overrides from './overrides';
import colorSchemes from './colorSchemes';
import spacing from './spacing';
import shadows from './shadows';
import customShadows from './customShadows';
import typographyConfig from './typography';
import type { Settings } from '@/@core/contexts/settingsTypes';

interface ThemeSettings {
  mode: Settings['mode'];
  skin: Settings['skin'];
  primaryColor: string;
  highContrast?: boolean;
}

const coreTheme = (
  settings: ThemeSettings,
  fontFamily: string,
): ThemeOptions => {
  const resolvedMode = settings.mode === 'system' ? 'light' : settings.mode;
  const colors = colorSchemes();
  const basePalette =
    resolvedMode === 'dark' ? colors.dark.palette : colors.light.palette;

  // Override primary color from settings
  const paletteObj = basePalette as Record<string, unknown>;
  const basePrimary = (paletteObj.primary ?? {}) as Record<string, string>;
  let palette: Record<string, unknown> = {
    ...paletteObj,
    primary: {
      ...basePrimary,
      main: settings.primaryColor,
    },
  };

  // Alto contraste — override palette para cumplir WCAG 1.4.6 (AAA contrast)
  if (settings.highContrast) {
    const isDark = resolvedMode === 'dark';
    const pureText = isDark ? '#ffffff' : '#000000';
    const pureBg = isDark ? '#000000' : '#ffffff';
    const paperBg = isDark ? '#0a0a0a' : '#ffffff';
    const strongBorder = isDark ? '#ffffff' : '#000000';

    palette = {
      ...palette,
      text: {
        primary: pureText,
        secondary: pureText,
        disabled: isDark ? '#9ca3af' : '#525252',
      },
      background: {
        default: pureBg,
        paper: paperBg,
      },
      divider: strongBorder,
      action: {
        ...(palette.action as Record<string, unknown> ?? {}),
        active: pureText,
        hover: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
        selected: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.16)',
        disabled: isDark ? '#6b7280' : '#525252',
      },
    };
  }

  return {
    palette: palette as ThemeOptions['palette'],
    components: overrides(settings.skin),
    ...spacing,
    shape: {
      borderRadius: 10,
    },
    shadows: shadows(resolvedMode) as ThemeOptions['shadows'],
    typography: typographyConfig(fontFamily),
    customShadows: customShadows(resolvedMode),
  } as ThemeOptions;
};

export default coreTheme;
