'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { alpha, useTheme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
}

const StatCard = ({ title, value, subtitle, icon, color, bgColor }: StatCardProps) => (
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
          <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        </Box>
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
          <i className={icon} style={{ fontSize: 22, color }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardView = () => {
  const user = useAppSelector(selectUser);
  const theme = useTheme();

  const stats: StatCardProps[] = [
    {
      title: 'Citas Hoy',
      value: '0',
      subtitle: 'Ninguna cita programada',
      icon: 'ri-calendar-check-line',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
    },
    {
      title: 'Pacientes',
      value: '0',
      subtitle: 'Total registrados',
      icon: 'ri-user-heart-line',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
    },
    {
      title: 'Doctores',
      value: '0',
      subtitle: 'Activos en el sistema',
      icon: 'ri-stethoscope-line',
      color: theme.palette.secondary.main,
      bgColor: alpha(theme.palette.secondary.main, 0.1),
    },
    {
      title: 'Especialidades',
      value: '0',
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

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Banner */}
      <Card
        sx={{
          mb: 3,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
          color: theme.palette.common.white,
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
            background: 'rgba(59, 130, 246, 0.1)',
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
            background: 'rgba(139, 92, 246, 0.08)',
          }}
        />
        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 4 } }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Typography>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Bienvenido, {user?.name ?? 'Usuario'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Resumen general de tu sistema médico MediClick
          </Typography>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={stat.title}>
            <StatCard {...stat} />
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
                      borderRadius: '10px',
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
                        borderRadius: '10px',
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
                {[
                  { label: 'Citas completadas hoy', value: 0, total: 0, color: theme.palette.info.main },
                  { label: 'Disponibilidad doctores', value: 0, total: 0, color: theme.palette.success.main },
                  { label: 'Ocupación consultorios', value: 0, total: 100, color: theme.palette.secondary.main },
                ].map((item) => (
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
                ))}

                <Box
                  sx={{
                    mt: 1,
                    p: 2.5,
                    borderRadius: '10px',
                    bgcolor: 'action.hover',
                    border: '1px dashed',
                    borderColor: 'divider',
                    textAlign: 'center',
                  }}
                >
                  <i className="ri-bar-chart-grouped-line" style={{ fontSize: 28, color: theme.palette.text.disabled, display: 'block', marginBottom: 4 }} />
                  <Typography variant="body2" color="text.secondary">
                    Los datos se actualizarán con información en tiempo real
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardView;
