'use client';

import { createContext, useMemo, useState, useCallback, useEffect } from 'react';
import type { Settings, SettingsContextValue } from './settingsTypes';
import themeConfig from '@/configs/themeConfig';
import primaryColorConfig from '@/configs/primaryColorConfig';

export const SettingsContext = createContext<SettingsContextValue | null>(null);

const COOKIE_NAME = themeConfig.settingsCookieName;
const COOKIE_PATTERN = new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`);

function readCookie(): Partial<Settings> | null {
  if (typeof window === 'undefined') return null;

  try {
    const match = document.cookie.match(COOKIE_PATTERN);
    if (match?.[1]) return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    // ignore
  }

  return null;
}

function writeCookie(settings: Settings) {
  if (typeof window === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify(settings));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface SettingsProviderProps {
  children: React.ReactNode;
  mode?: string;
}

export const SettingsProvider = ({ children, mode }: SettingsProviderProps) => {
  const initialSettings: Settings = {
    mode: (mode as Settings['mode']) || themeConfig.mode,
    skin: themeConfig.skin,
    semiDark: themeConfig.semiDark,
    layout: themeConfig.layout,
    navbarContentWidth: themeConfig.navbar.contentWidth,
    contentWidth: themeConfig.contentWidth,
    footerContentWidth: themeConfig.footer.contentWidth,
    primaryColor: primaryColorConfig[0]?.main ?? '#2563EB',
  };

  const [settingsState, setSettingsState] = useState<Settings>(() => {
    const cookieSettings = readCookie();
    return cookieSettings ? { ...initialSettings, ...cookieSettings } : initialSettings;
  });

  useEffect(() => {
    writeCookie(settingsState);
  }, [settingsState]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(initialSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSettingsChanged = useMemo(
    () => JSON.stringify(initialSettings) !== JSON.stringify(settingsState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsState],
  );

  return (
    <SettingsContext.Provider
      value={{ settings: settingsState, updateSettings, resetSettings, isSettingsChanged }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
