import type { Components, Theme } from '@mui/material/styles';

const card = (): Components<Theme> => ({
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        backgroundImage: 'none',
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: {
        padding: 20,
      },
      subheader: {
        fontSize: '0.8125rem',
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: 20,
        '&:last-child': {
          paddingBottom: 20,
        },
      },
    },
  },
  MuiCardActions: {
    styleOverrides: {
      root: {
        padding: '12px 20px',
      },
    },
  },
});

export default card;
