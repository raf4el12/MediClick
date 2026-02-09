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
  const palette = {
    ...paletteObj,
    primary: {
      ...basePrimary,
      main: settings.primaryColor,
    },
  };

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
