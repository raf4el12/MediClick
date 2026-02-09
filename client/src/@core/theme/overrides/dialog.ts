import type { Components, Theme } from '@mui/material/styles';

const dialog = (): Components<Theme> => ({
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.125rem',
        fontWeight: 600,
        padding: '20px 24px',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '8px 24px 20px',
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '12px 24px 20px',
      },
    },
  },
});

export default dialog;
