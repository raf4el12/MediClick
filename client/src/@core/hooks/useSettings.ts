'use client';

import { useContext } from 'react';
import { SettingsContext } from '@/@core/contexts/settingsContext';
import type { SettingsContextValue } from '@/@core/contexts/settingsTypes';

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
};
