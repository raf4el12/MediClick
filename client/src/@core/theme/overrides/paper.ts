import type { Components, Theme } from '@mui/material/styles';

const paper = (): Components<Theme> => ({
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      rounded: {
        borderRadius: 12,
      },
    },
  },
});

export default paper;
