'use client';

import { useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import coreTheme from '@/@core/theme';
import { StoreProvider } from '@/redux-store/StoreProvider';
import { SettingsProvider } from '@/@core/contexts/settingsContext';
import { useSettings } from '@/@core/hooks/useSettings';
import SessionValidator from '@/components/SessionValidator';
import Customizer from '@/@core/components/customizer';

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
          },
          fontFamily,
        ),
      ),
    [settings.mode, settings.skin, settings.primaryColor],
  );

  // Sync CSS custom properties with current theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.palette.primary.main);
    root.style.setProperty('--border-color', theme.palette.divider);
    root.style.setProperty('--border-radius', `${theme.shape.borderRadius}px`);
  }, [theme]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <StoreProvider>
      <SettingsProvider>
        <ThemeWrapper>
          <SessionValidator />
          <Customizer />
          {children}
        </ThemeWrapper>
      </SettingsProvider>
    </StoreProvider>
  );
}
