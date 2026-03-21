import Chip, { ChipProps } from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

export interface StatusBadgeProps extends Omit<ChipProps, 'width' | 'height'> {
  width?: number | string;
  height?: number | string;
}

export const StatusBadge = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'width' && prop !== 'height',
})<StatusBadgeProps>(({ width = 110, height = 28 }) => ({
  width,
  height,
  borderRadius: 50,
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'none',
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  '& .MuiChip-label': {
    padding: '0 8px',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
    textAlign: 'center',
  },
  '& .MuiChip-icon': {
    marginLeft: 8,
    marginRight: -4,
    fontSize: 16,
  }
}));

export default StatusBadge;
