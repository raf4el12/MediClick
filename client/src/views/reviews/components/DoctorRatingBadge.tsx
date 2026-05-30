'use client';

import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';

interface DoctorRatingBadgeProps {
  ratingAvg: number | null;
  ratingCount: number;
  size?: 'small' | 'medium';
}

export function DoctorRatingBadge({
  ratingAvg,
  ratingCount,
  size = 'small',
}: DoctorRatingBadgeProps) {
  if (ratingCount === 0 || ratingAvg == null) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin reseñas
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Rating value={ratingAvg} precision={0.5} readOnly size={size} />
      <Typography variant="caption" color="text.secondary">
        {ratingAvg.toFixed(1)} ({ratingCount})
      </Typography>
    </Box>
  );
}
