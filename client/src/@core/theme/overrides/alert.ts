import type { Components, Theme } from '@mui/material/styles';

const alert = (): Components<Theme> => ({
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        fontSize: '0.875rem',
      },
      standardError: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        color: '#DC2626',
      },
      standardSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        color: '#059669',
      },
      standardWarning: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        color: '#D97706',
      },
      standardInfo: {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        color: '#2563EB',
      },
    },
  },
});

export default alert;
