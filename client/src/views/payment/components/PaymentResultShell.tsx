'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

type StatusColor = 'success' | 'error' | 'warning';

interface PaymentResultShellProps {
  color: StatusColor;
  icon: string;
  title: string;
  description: string;
  body?: ReactNode;
  actions: ReactNode;
}

export function PaymentResultShell({
  color,
  icon,
  title,
  description,
  body,
  actions,
}: PaymentResultShellProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%', borderRadius: 3, p: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: `${color}.main`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className={icon} style={{ fontSize: 36, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={700} textAlign="center">
            {title}
          </Typography>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            {description}
          </Typography>

          {body}

          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {actions}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
