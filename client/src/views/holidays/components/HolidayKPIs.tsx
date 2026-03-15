'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import type { Holiday } from '../types';

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

interface HolidayKPIsProps {
  entries: Holiday[];
  total: number;
}

export function HolidayKPIs({ entries, total }: HolidayKPIsProps) {
  const theme = useTheme();

  const recurring = entries.filter((e) => e.isRecurring === true).length;
  const custom = entries.filter((e) => e.isRecurring === false).length;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, lg: 4 }}>
        <KPICard
          title="Total Feriados"
          count={total}
          icon="ri-calendar-event-line"
          color={theme.palette.secondary.main}
        />
      </Grid>
      <Grid size={{ xs: 6, lg: 4 }}>
        <KPICard
          title="Recurrentes"
          count={recurring}
          icon="ri-repeat-line"
          color={theme.palette.info.main}
        />
      </Grid>
      <Grid size={{ xs: 6, lg: 4 }}>
        <KPICard
          title="Personalizados"
          count={custom}
          icon="ri-calendar-todo-line"
          color={theme.palette.warning.main}
        />
      </Grid>
    </Grid>
  );
}
