import type { Components, Theme } from '@mui/material/styles';

import button from './button';
import input from './input';
import card from './card';
import chip from './chip';
import dialog from './dialog';
import paper from './paper';
import alert from './alert';

const overrides = (skin?: string): Components<Theme> => {
  const shadow = skin === 'shadow';

  return Object.assign(
    {},
    button(),
    input(),
    card(),
    chip(),
    dialog(),
    paper(),
    alert(),
    shadow
      ? {
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      }
      : {},
  );
};

export default overrides;
