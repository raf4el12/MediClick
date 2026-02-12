'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface AvailabilitySummaryProps {
  activeDays: number;
  weeklyHours: number;
}

export function AvailabilitySummary({
  activeDays,
  weeklyHours,
}: AvailabilitySummaryProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
        gap: 1.5,
      }}
    >
      <Card variant="outlined">
        <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
          <Typography variant="h4" fontWeight={700}>
            {activeDays}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Días activos
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
          <Typography variant="h4" fontWeight={700}>
            {weeklyHours}h
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Horas semanales
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>
        <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
          <Typography variant="h4" fontWeight={700} color="success.main">
            Activo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Estado
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
