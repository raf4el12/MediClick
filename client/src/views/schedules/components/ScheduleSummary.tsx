'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface ScheduleSummaryProps {
  totalSchedules: number;
  uniqueDoctors: number;
  scheduledDays: number;
}

export function ScheduleSummary({
  totalSchedules,
  uniqueDoctors,
  scheduledDays,
}: ScheduleSummaryProps) {
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
            {totalSchedules}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Citas generadas
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
          <Typography variant="h4" fontWeight={700}>
            {uniqueDoctors}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Doctores
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>
        <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
          <Typography variant="h4" fontWeight={700} color="success.main">
            {scheduledDays}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Días con horario
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
