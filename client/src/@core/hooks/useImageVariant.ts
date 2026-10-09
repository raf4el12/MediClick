'use client';

import { useColorScheme } from '@mui/material/styles';
import { useSettings } from './useSettings';

/** Elige la variante de una ilustración según el modo de color y el skin. */
export const useImageVariant = (
  imgLight: string,
  imgDark: string,
  imgLightBordered?: string,
  imgDarkBordered?: string,
): string => {
  const { settings } = useSettings();
  const { mode, systemMode } = useColorScheme();

  const isDarkMode = (mode === 'system' ? systemMode : mode) === 'dark';

  if (settings.skin === 'bordered' && imgLightBordered && imgDarkBordered) {
    return isDarkMode ? imgDarkBordered : imgLightBordered;
  }

  return isDarkMode ? imgDark : imgLight;
};
