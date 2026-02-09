import type { Components, Theme } from '@mui/material/styles';

const chip = (): Components<Theme> => ({
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        borderRadius: 8,
      },
      sizeSmall: {
        height: 24,
        fontSize: '0.75rem',
      },
    },
  },
});

export default chip;
