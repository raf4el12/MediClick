import type { Components, Theme } from '@mui/material/styles';

const input = (): Components<Theme> => ({
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      fullWidth: true,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 2,
        },
      },
      notchedOutline: {
        borderColor: 'rgba(0, 0, 0, 0.12)',
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
      },
    },
  },
  MuiFilledInput: {
    styleOverrides: {
      root: {
        borderRadius: '10px 10px 0 0',
      },
    },
  },
});

export default input;
