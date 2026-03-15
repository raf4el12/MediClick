'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import type { ScheduleBlock } from '../types';
import { ScheduleBlockType } from '../types';

interface KPICardProps {
  title: string;
  count: number;
  icon: string;
  color: string;
}

function KPICard({ title, count, icon, color }: KPICardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 200ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 16px ${alpha(color, 0.18)}`,
        },
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2.5,
          px: 2.5,
          '&:last-child': { pb: 2.5 },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} lineHeight={1} sx={{ mb: 0.5 }}>
            {count}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className={icon} style={{ fontSize: 24, color }} />
        </Box>
      </CardContent>
    </Card>
  );
}

interface ScheduleBlockKPIsProps {
  entries: ScheduleBlock[];
  total: number;
}

export function ScheduleBlockKPIs({ entries, total }: ScheduleBlockKPIsProps) {
  const theme = useTheme();

  const fullDay = entries.filter((e) => e.type === ScheduleBlockType.FULL_DAY).length;
  const timeRange = entries.filter((e) => e.type === ScheduleBlockType.TIME_RANGE).length;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, lg: 3 }}>
        <KPICard
          title="Total Bloqueos"
          count={total}
          icon="ri-calendar-close-line"
          color={theme.palette.secondary.main}
        />
      </Grid>
      <Grid size={{ xs: 6, lg: 3 }}>
        <KPICard
          title="Día Completo"
          count={fullDay}
          icon="ri-calendar-2-line"
          color={theme.palette.warning.main}
        />
      </Grid>
      <Grid size={{ xs: 6, lg: 3 }}>
        <KPICard
          title="Rango Horario"
          count={timeRange}
          icon="ri-time-line"
          color={theme.palette.info.main}
        />
      </Grid>
      <Grid size={{ xs: 6, lg: 3 }}>
        <KPICard
          title="Activos"
          count={total}
          icon="ri-checkbox-circle-line"
          color={theme.palette.success.main}
        />
      </Grid>
    </Grid>
  );
}
