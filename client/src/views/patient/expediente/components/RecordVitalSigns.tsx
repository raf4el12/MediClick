'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

export default function RecordVitalSigns() {
  const theme = useTheme();

  return (
    <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ py: 8, textAlign: 'center' }}>
        <i
          className="ri-pulse-line"
          style={{ fontSize: 56, color: theme.palette.text.disabled }}
        />
        <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>
          Signos Vitales
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto' }}>
          El registro de signos vitales estará disponible próximamente.
        </Typography>
      </CardContent>
    </Card>
  );
}
