'use client';

import { useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import coreTheme from '@/@core/theme';
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

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  const theme = useMemo(
    () =>
      createTheme(
        coreTheme(
          {
            mode: settings.mode,
            skin: settings.skin,
            primaryColor: settings.primaryColor,
            highContrast: settings.highContrast,
          },
          fontFamily,
        ),
      ),
    [settings.mode, settings.skin, settings.primaryColor, settings.highContrast],
  );

  // Sync CSS custom properties with current theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.palette.primary.main);
    root.style.setProperty('--border-color', theme.palette.divider);
    root.style.setProperty('--border-radius', `${theme.shape.borderRadius}px`);
    root.style.setProperty('--background-paper', theme.palette.background.paper);
    root.style.setProperty('--background-default', theme.palette.background.default);
    root.style.setProperty('--text-primary', theme.palette.text.primary);
    root.style.setProperty('--text-secondary', theme.palette.text.secondary);
    root.style.setProperty('--action-active', theme.palette.action.active);
  }, [theme]);

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
    <MuiThemeProvider theme={theme}>
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
