'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import type { MedicalHistory } from '../types';
import { MedicalHistoryStatus } from '../types';

interface KPICardProps {
  title: string;
  count: number;
  icon: string;
  color: string;
  bgColor: string;
}

function KPICard({ title, count, icon, color, bgColor }: KPICardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            bgcolor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className={icon} style={{ fontSize: 24, color }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {count}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

interface MedicalHistoryKPIsProps {
  entries: MedicalHistory[];
  total: number;
}

export function MedicalHistoryKPIs({ entries, total }: MedicalHistoryKPIsProps) {
  const active = entries.filter((e) => e.status === MedicalHistoryStatus.ACTIVE).length;
  const chronic = entries.filter((e) => e.status === MedicalHistoryStatus.CHRONIC).length;
  const resolved = entries.filter((e) => e.status === MedicalHistoryStatus.RESOLVED).length;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard
          title="Total"
          count={total}
          icon="ri-file-list-3-line"
          color="#7C3AED"
          bgColor="rgba(124, 58, 237, 0.08)"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard
          title="Activas"
          count={active}
          icon="ri-pulse-line"
          color="#2196F3"
          bgColor="rgba(33, 150, 243, 0.08)"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard
          title="Crónicas"
          count={chronic}
          icon="ri-heart-pulse-line"
          color="#FF9800"
          bgColor="rgba(255, 152, 0, 0.08)"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard
          title="Resueltas"
          count={resolved}
          icon="ri-check-double-line"
          color="#4CAF50"
          bgColor="rgba(76, 175, 80, 0.08)"
        />
      </Grid>
    </Grid>
  );
}
