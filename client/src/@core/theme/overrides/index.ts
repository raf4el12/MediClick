import type { Components, Theme } from '@mui/material/styles';

import button from './button';
import input from './input';
import card from './card';
import chip from './chip';
import dialog from './dialog';
import paper from './paper';
import alert from './alert';

const overrides = (skin?: string): Components<Theme> => {
  const bordered = skin === 'bordered';

  return Object.assign(
    {},
    button(),
    input(),
    card(),
    chip(),
    dialog(),
    paper(),
    alert(),
    bordered
      ? {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'var(--mui-palette-divider)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'var(--mui-palette-divider)',
              },
            },
          },
        }
      : {},
  );
};

export default overrides;
