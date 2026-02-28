'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { alpha, darken, useTheme } from '@mui/material/styles';
import { useDashboard } from './hooks/useDashboard';

const TODAY_LABEL = new Date().toLocaleDateString('es-ES', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  loading?: boolean;
}

const StatCard = ({ title, value, subtitle, icon, color, bgColor, loading }: StatCardProps) => (
  <Card
    sx={{
      transition: 'all 200ms ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 1 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={60} height={40} />
          ) : (
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
              {value}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            bgcolor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className={icon} style={{ fontSize: 22, color }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardView = () => {
  const user = useAppSelector(selectUser);
  const theme = useTheme();
  const { stats, summary, occupancy, loading } = useDashboard();

  const completedToday = summary?.byStatus?.COMPLETED ?? 0;
  const totalToday = stats.todayAppointments;
  const bookedSlots = occupancy?.bookedSlots ?? 0;
  const totalSlots = occupancy?.totalSlots ?? 0;
  const occupancyRate = occupancy?.occupancyRate ?? 0;

  const statCards: StatCardProps[] = [
    {
      title: 'Citas Hoy',
      value: String(stats.todayAppointments),
      subtitle: stats.todayAppointments === 1 ? '1 cita programada' : `${stats.todayAppointments} citas programadas`,
      icon: 'ri-calendar-check-line',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
    },
    {
      title: 'Pacientes',
      value: String(stats.totalPatients),
      subtitle: 'Total registrados',
      icon: 'ri-user-heart-line',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
    },
    {
      title: 'Doctores',
      value: String(stats.totalDoctors),
      subtitle: 'Activos en el sistema',
      icon: 'ri-stethoscope-line',
      color: theme.palette.secondary.main,
      bgColor: alpha(theme.palette.secondary.main, 0.1),
    },
    {
      title: 'Especialidades',
      value: String(stats.totalSpecialties),
      subtitle: 'Áreas médicas',
      icon: 'ri-heart-pulse-line',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1),
    },
  ];

  const quickActions = [
    {
      label: 'Agendar Cita',
      description: 'Crear nueva cita médica',
      icon: 'ri-calendar-todo-line',
      href: '/appointments',
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.08),
    },
    {
      label: 'Ver Pacientes',
      description: 'Gestionar pacientes',
      icon: 'ri-user-heart-line',
      href: '/patients',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.08),
    },
    {
      label: 'Especialidades',
      description: 'Administrar áreas',
      icon: 'ri-heart-pulse-line',
      href: '/specialties',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.08),
    },
    {
      label: 'Reportes',
      description: 'Estadísticas del sistema',
      icon: 'ri-bar-chart-box-line',
      href: '/reports',
      color: theme.palette.secondary.main,
      bgColor: alpha(theme.palette.secondary.main, 0.08),
    },
  ];

  const systemStatus = [
    {
      label: 'Citas completadas hoy',
      value: completedToday,
      total: totalToday,
      color: theme.palette.info.main,
    },
    {
      label: 'Doctores activos',
      value: stats.totalDoctors,
      total: stats.totalDoctors,
      color: theme.palette.success.main,
    },
    {
      label: 'Ocupación de horarios',
      value: bookedSlots,
      total: totalSlots,
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Banner */}
      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, ${darken(theme.palette.primary.main, 0.55)} 0%, ${darken(theme.palette.primary.main, 0.35)} 100%)`,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: alpha(theme.palette.primary.main, 0.1),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -40,
            right: 80,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: alpha(theme.palette.secondary.main, 0.08),
          }}
        />
        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 4 } }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 0.5 }}>
            {TODAY_LABEL}
          </Typography>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Bienvenido, {user?.name ?? 'Usuario'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
            Resumen general de tu sistema médico MediClick
          </Typography>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={stat.title}>
            <StatCard {...stat} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, fontSize: '1rem' }}>
                Acciones Rápidas
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {quickActions.map((action) => (
                  <Box
                    key={action.label}
                    component={Link}
                    href={action.href}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      textDecoration: 'none',
                      color: 'text.primary',
                      transition: 'all 200ms ease',
                      '&:hover': {
                        borderColor: action.color,
                        transform: 'translateX(4px)',
                        bgcolor: action.bgColor,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        bgcolor: action.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <i className={action.icon} style={{ fontSize: 20, color: action.color }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {action.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {action.description}
                      </Typography>
                    </Box>
                    <i className="ri-arrow-right-s-line" style={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5, fontSize: '1rem' }}>
                Estado del Sistema
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {loading ? (
                  <>
                    <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                  </>
                ) : (
                  systemStatus.map((item) => (
                    <Box key={item.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.value}/{item.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={item.total > 0 ? (item.value / item.total) * 100 : 0}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: item.color,
                          },
                        }}
                      />
                    </Box>
                  ))
                )}

                {!loading && summary && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.info.main, 0.06),
                      border: '1px solid',
                      borderColor: alpha(theme.palette.info.main, 0.15),
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      Resumen del mes
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          {summary.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total citas
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          {summary.byStatus?.COMPLETED ?? 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Completadas
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="warning.main">
                          {summary.byStatus?.PENDING ?? 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pendientes
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="error.main">
                          {summary.byStatus?.CANCELLED ?? 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Canceladas
                        </Typography>
                      </Box>
                      {occupancy && (
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="secondary.main">
                            {Math.round(occupancyRate)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Ocupación
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardView;
