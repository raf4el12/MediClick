'use client';

import { useMemo, useEffect } from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  darken,
  lighten,
  useColorScheme,
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { deepmerge } from '@mui/utils';
import { useMedia } from 'react-use';
import coreTheme from '@/@core/theme';
import primaryColorConfig from '@/configs/primaryColorConfig';
import type { Settings } from '@/@core/contexts/settingsTypes';
import { StoreProvider } from '@/redux-store/StoreProvider';
import { QueryProvider } from '@/components/QueryProvider';
import { SettingsProvider } from '@/@core/contexts/settingsContext';
import { useSettings } from '@/@core/hooks/useSettings';
import SessionValidator from '@/components/SessionValidator';
import ColorBlindFilters from '@/@core/components/accessibility/ColorBlindFilters';
interface ProvidersProps {
  children: React.ReactNode;
}

const fontFamily = '"Inter", "Roboto", "Helvetica", "Arial", sans-serif';

// Con variables CSS, MUI elige el esquema por el atributo data-light/data-dark
// de <html>; este componente lo sincroniza con el modo de los ajustes.
function ModeChanger({ mode }: { mode: Settings['mode'] }) {
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  return null;
}

function primaryShades(main: string) {
  const preset = primaryColorConfig.find((color) => color.main === main);
  return {
    main,
    light: preset?.light ?? lighten(main, 0.2),
    dark: preset?.dark ?? darken(main, 0.1),
  };
}

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const prefersDark = useMedia('(prefers-color-scheme: dark)', false);
  const currentMode =
    settings.mode === 'system' ? (prefersDark ? 'dark' : 'light') : settings.mode;

  const theme = useMemo(() => {
    const primary = primaryShades(settings.primaryColor);
    return createTheme(
      deepmerge(
        coreTheme(
          { skin: settings.skin, highContrast: settings.highContrast },
          currentMode,
          fontFamily,
        ),
        {
          colorSchemes: {
            light: { palette: { primary } },
            dark: { palette: { primary } },
          },
          cssVariables: { colorSchemeSelector: 'data' },
        },
      ),
    );
  }, [settings.skin, settings.primaryColor, settings.highContrast, currentMode]);

  // Apply accessibility settings as attributes/CSS vars on <html>
  useEffect(() => {
    const root = document.documentElement;
    const fontSizeMap = { normal: '16px', large: '18px', xlarge: '20px' };
    root.style.fontSize = fontSizeMap[settings.fontSize ?? 'normal'];
    root.dataset.highContrast = settings.highContrast ? 'true' : 'false';
    root.dataset.largeTargets = settings.largeTargets ? 'true' : 'false';
    root.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';
    root.dataset.colorBlind = settings.colorBlindMode ?? 'none';
  }, [
    settings.fontSize,
    settings.highContrast,
    settings.largeTargets,
    settings.reduceMotion,
    settings.colorBlindMode,
  ]);

  // Recharts mide con ResizeObserver y no se entera cuando se aplica/quita
  // un CSS filter en un ancestro (crea nuevo containing block). Forzamos un
  // resize event para que los charts se re-midan después del cambio.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    return () => clearTimeout(t);
  }, [settings.colorBlindMode, settings.fontSize, settings.largeTargets]);

  return (
    <MuiThemeProvider theme={theme} defaultMode={settings.mode} forceThemeRerender>
      <ModeChanger mode={settings.mode} />
      <CssBaseline />
      <ColorBlindFilters />
      {children}
    </MuiThemeProvider>
  );
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <StoreProvider>
        <SettingsProvider>
          <ThemeWrapper>
            <SessionValidator />
            {children}
          </ThemeWrapper>
        </SettingsProvider>
      </StoreProvider>
    </QueryProvider>
  );
}
