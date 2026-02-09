'use client';

import { forwardRef } from 'react';
import MuiAvatar, { type AvatarProps } from '@mui/material/Avatar';
import { styled, lighten } from '@mui/material/styles';

type AvatarSkin = 'filled' | 'light' | 'light-static';
type AvatarColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

interface CustomAvatarProps extends AvatarProps {
  skin?: AvatarSkin;
  color?: AvatarColor;
  size?: number;
}

const StyledAvatar = styled(MuiAvatar, {
  shouldForwardProp: (prop) => prop !== 'skin' && prop !== 'color' && prop !== 'size',
})<{ skin?: AvatarSkin; color?: AvatarColor; size?: number }>(
  ({ skin, color, size, theme }) => ({
    ...(color &&
      skin === 'light' && {
        backgroundColor: lighten(theme.palette[color].main, 0.84),
        color: theme.palette[color].main,
      }),
    ...(color &&
      skin === 'light-static' && {
        backgroundColor: lighten(theme.palette[color].main, 0.84),
        color: theme.palette[color].main,
      }),
    ...(color &&
      skin === 'filled' && {
        backgroundColor: theme.palette[color].main,
        color: theme.palette[color].contrastText,
      }),
    ...(size && {
      height: size,
      width: size,
      fontSize: size * 0.4,
    }),
  }),
);

const CustomAvatar = forwardRef<HTMLDivElement, CustomAvatarProps>(
  ({ color, skin = 'filled', ...rest }, ref) => (
    <StyledAvatar color={color} skin={skin} ref={ref} {...rest} />
  ),
);

CustomAvatar.displayName = 'CustomAvatar';

export default CustomAvatar;
