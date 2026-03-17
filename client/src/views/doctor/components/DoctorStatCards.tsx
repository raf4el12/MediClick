'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';

interface DoctorStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

interface DoctorStatCardsProps {
  stats: DoctorStats;
  loading: boolean;
}

export function DoctorStatCards({ stats, loading }: DoctorStatCardsProps) {
  const theme = useTheme();

  const cards = [
    {
      title: 'Total Hoy',
      value: stats.total,
      subtitle: 'Citas programadas',
      icon: 'ri-calendar-check-line',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
    },
    {
      title: 'En Espera',
      value: stats.pending,
      subtitle: 'Pendientes / Confirmadas',
      icon: 'ri-time-line',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1),
    },
    {
      title: 'En Consulta',
      value: stats.inProgress,
      subtitle: 'En atención ahora',
      icon: 'ri-stethoscope-line',
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.1),
    },
    {
      title: 'Completadas',
      value: stats.completed,
      subtitle: 'Atendidas hoy',
      icon: 'ri-check-double-line',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
    },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card) => (
        <Grid size={{ xs: 6, sm: 3 }} key={card.title}>
          <Card
            sx={{
              transition: 'all 200ms ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 0.5 }}>
                    {card.title}
                  </Typography>
                  {loading ? (
                    <Skeleton variant="text" width={40} height={36} />
                  ) : (
                    <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
                      {card.value}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    {card.subtitle}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 3,
                    bgcolor: card.bgColor,
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className={card.icon} style={{ fontSize: 20, color: card.color }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
