interface ColorSchemes {
  light: Record<string, unknown>;
  dark: Record<string, unknown>;
}

const colorSchemes = (): ColorSchemes => ({
  light: {
    palette: {
      primary: {
        main: '#2563EB',
        light: '#60A5FA',
        dark: '#1D4ED8',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#7C3AED',
        light: '#A78BFA',
        dark: '#5B21B6',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#EF4444',
        light: '#FCA5A5',
        dark: '#DC2626',
      },
      warning: {
        main: '#F59E0B',
        light: '#FCD34D',
        dark: '#D97706',
      },
      info: {
        main: '#3B82F6',
        light: '#93C5FD',
        dark: '#2563EB',
      },
      success: {
        main: '#10B981',
        light: '#6EE7B7',
        dark: '#059669',
      },
      background: {
        default: '#F0F4F8',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#1B2537',
        secondary: '#64748B',
        disabled: '#94A3B8',
      },
      divider: '#E2E8F0',
      action: {
        active: '#64748B',
        hover: 'rgba(37, 99, 235, 0.04)',
        selected: 'rgba(37, 99, 235, 0.08)',
        disabled: '#94A3B8',
        disabledBackground: '#E2E8F0',
      },
    },
  },
  dark: {
    palette: {
      primary: {
        main: '#3B82F6',
        light: '#60A5FA',
        dark: '#2563EB',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#8B5CF6',
        light: '#A78BFA',
        dark: '#7C3AED',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#F87171',
        light: '#FCA5A5',
        dark: '#EF4444',
      },
      warning: {
        main: '#FBBF24',
        light: '#FCD34D',
        dark: '#F59E0B',
      },
      info: {
        main: '#60A5FA',
        light: '#93C5FD',
        dark: '#3B82F6',
      },
      success: {
        main: '#34D399',
        light: '#6EE7B7',
        dark: '#10B981',
      },
      background: {
        default: '#0F172A',
        paper: '#1E293B',
      },
      text: {
        primary: '#F1F5F9',
        secondary: '#94A3B8',
        disabled: '#475569',
      },
      divider: '#334155',
      action: {
        active: '#94A3B8',
        hover: 'rgba(59, 130, 246, 0.08)',
        selected: 'rgba(59, 130, 246, 0.12)',
        disabled: '#475569',
        disabledBackground: '#334155',
      },
    },
  },
});

export default colorSchemes;
