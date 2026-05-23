export type FontSize = 'normal' | 'large' | 'xlarge';

export interface Settings {
  mode: 'light' | 'dark' | 'system';
  skin: 'default' | 'shadow';
  semiDark: boolean;
  layout: 'vertical' | 'collapsed';
  navbarContentWidth: 'compact' | 'wide';
  contentWidth: 'compact' | 'wide';
  footerContentWidth: 'compact' | 'wide';
  primaryColor: string;
  // Accesibilidad (WCAG 2.1 AA / NTP-ISO/IEC 40500:2012)
  fontSize: FontSize;
  highContrast: boolean;
  largeTargets: boolean;
  reduceMotion: boolean;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  isSettingsChanged: boolean;
}
