export interface Settings {
  mode: 'light' | 'dark' | 'system';
  skin: 'default' | 'shadow';
  semiDark: boolean;
  layout: 'vertical' | 'collapsed';
  navbarContentWidth: 'compact' | 'wide';
  contentWidth: 'compact' | 'wide';
  footerContentWidth: 'compact' | 'wide';
  primaryColor: string;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  isSettingsChanged: boolean;
}
