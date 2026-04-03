'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { alpha, useTheme } from '@mui/material/styles';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { appointmentsService } from '@/services/appointments.service';
import { AppointmentStatus } from '@/views/appointments/types';
import type { Appointment } from '@/views/appointments/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', dot: '#fbbf24' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: '#34d399', bg: 'rgba(52, 211, 153, 0.2)', dot: '#34d399' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En Curso', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)', dot: '#60a5fa' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', dot: '#10b981' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', dot: '#f87171' },
  [AppointmentStatus.NO_SHOW]: { label: 'No Asistió', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', dot: '#94a3b8' },
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
};

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('es-PE', { day: 'numeric', timeZone: 'UTC' }),
    month: date.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }),
    year: date.toLocaleDateString('es-PE', { year: 'numeric', timeZone: 'UTC' }),
  };
};

export default function PatientDashboardView() {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const theme = useTheme();
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [recent, setRecent] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [upcomingRes, recentRes] = await Promise.all([
          appointmentsService.getMyAppointments(
            { pageSize: 5, orderBy: 'createdAt', orderByMode: 'desc' },
            { upcoming: true },
          ),
          appointmentsService.getMyAppointments(
            { pageSize: 3, orderBy: 'createdAt', orderByMode: 'desc' },
            { status: AppointmentStatus.COMPLETED },
          ),
        ]);
        setUpcoming(upcomingRes.rows);
        setRecent(recentRes.rows);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const nextAppointment = upcoming[0] ?? null;
  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

  const quickActions = [
    {
      label: 'Agendar Cita',
      description: 'Presencial o a domicilio',
      icon: 'ri-calendar-check-line',
      href: '/patient/book',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
      hoverBorder: theme.palette.primary.main,
    },
    {
      label: 'Mis Citas',
      description: 'Gestiona tus consultas',
      icon: 'ri-stethoscope-line',
      href: '/patient/appointments',
      color: '#0d9488',
      bgColor: alpha('#0d9488', 0.1),
      hoverBorder: '#0d9488',
    },
    {
      label: 'Mi Perfil',
      description: 'Datos personales',
      icon: 'ri-user-heart-line',
      href: '/patient/profile',
      color: '#4f46e5',
      bgColor: alpha('#4f46e5', 0.1),
      hoverBorder: '#4f46e5',
    },
    {
      label: 'Mi Expediente',
      description: 'Historial clínico completo',
      icon: 'ri-file-chart-line',
      href: '/patient/expediente',
      color: '#e11d48',
      bgColor: alpha('#e11d48', 0.1),
      hoverBorder: '#e11d48',
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          {getGreeting()}, {firstName}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aquí está el resumen de tu salud al día de hoy.
        </Typography>
      </Box>

      {/* ── Quick Actions ── */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {quickActions.map((action) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={action.label}>
            <Card
              sx={{
                borderRadius: '24px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: action.hoverBorder,
                  boxShadow: `0 20px 25px -5px ${alpha(action.color, 0.15)}`,
                },
              }}
            >
              <CardActionArea
                onClick={() => router.push(action.href)}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    bgcolor: action.bgColor,
                    color: action.color,
                    mb: 2,
                  }}
                >
                  <i className={action.icon} style={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {action.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {action.description}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Main Content (2/3 + 1/3) ── */}
      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Next Appointment Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, px: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Tu próxima cita
            </Typography>
            <Button
              component={Link}
              href="/patient/appointments"
              sx={{ fontWeight: 600 }}
              endIcon={<i className="ri-arrow-right-s-line" style={{ fontSize: 16 }} />}
            >
              Ver todas
            </Button>
          </Box>

          {/* Next Appointment Card */}
          {loading ? (
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: '24px', mb: 5 }} />
          ) : nextAppointment ? (
            <Card
              sx={{
                borderRadius: '24px',
                mb: 5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #3730a3 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                border: 'none',
                boxShadow: `0 20px 25px -5px ${alpha(theme.palette.primary.main, 0.25)}`,
              }}
            >
              {/* Decorative background icon */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  opacity: 0.08,
                  transform: 'rotate(15deg)',
                }}
              >
                <i className="ri-heart-pulse-line" style={{ fontSize: 200 }} />
              </Box>

              <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                <Grid container spacing={4} alignItems="center" justifyContent="space-between">
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Chip
                      label={statusConfig[nextAppointment.status]?.label ?? nextAppointment.status}
                      size="small"
                      icon={
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            bgcolor: statusConfig[nextAppointment.status]?.dot ?? '#34d399',
                            borderRadius: '50%',
                            ml: 1,
                          }}
                        />
                      }
                      sx={{
                        bgcolor: statusConfig[nextAppointment.status]?.bg ?? 'rgba(52, 211, 153, 0.2)',
                        color: '#d1fae5',
                        border: `1px solid ${alpha(statusConfig[nextAppointment.status]?.dot ?? '#34d399', 0.3)}`,
                        fontWeight: 'bold',
                        mb: 2,
                      }}
                    />
                    <Typography variant="h4" fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.02em' }}>
                      {nextAppointment.schedule.specialty.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9 }}>
                      <i className="ri-user-line" style={{ fontSize: 18 }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Dr. {nextAppointment.schedule.doctor.name} {nextAppointment.schedule.doctor.lastName}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        boxShadow: 3,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="ri-calendar-line" style={{ fontSize: 28 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ color: 'text.primary', lineHeight: 1.2 }} fontWeight={700}>
                          {formatDate(nextAppointment.schedule.scheduleDate)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                          <i className="ri-time-line" style={{ fontSize: 16 }} />
                          <Typography variant="body2" fontWeight={600}>
                            {nextAppointment.startTime}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 3 }} />

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9 }}>
                    <i className="ri-map-pin-line" style={{ fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {nextAppointment.reason ?? 'Consulta médica programada'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                      variant="outlined"
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '12px',
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                        flex: { xs: 1, sm: 'none' },
                      }}
                      onClick={() => router.push('/patient/appointments')}
                    >
                      Reprogramar
                    </Button>
                    <Button
                      variant="contained"
                      sx={{
                        bgcolor: 'white',
                        color: theme.palette.primary.main,
                        borderRadius: '12px',
                        '&:hover': { bgcolor: '#f8fafc' },
                        flex: { xs: 1, sm: 'none' },
                      }}
                      onClick={() => router.push('/patient/appointments')}
                    >
                      Ver detalle
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card
              sx={{
                borderRadius: '24px',
                mb: 5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha('#3730a3', 0.05)} 100%)`,
                border: '2px dashed',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            >
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <i className="ri-calendar-check-line" style={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  No tienes citas próximas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Agenda una consulta médica para cuidar tu salud
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => router.push('/patient/book')}
                  sx={{ borderRadius: '12px', px: 4 }}
                >
                  Agendar Cita
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Visits */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, px: 1 }}>
            Atenciones recientes
          </Typography>
          {loading ? (
            <Paper sx={{ borderRadius: '24px', overflow: 'hidden' }} elevation={0}>
              {[1, 2].map((i) => (
                <Box key={i} sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Skeleton variant="rounded" height={48} />
                </Box>
              ))}
            </Paper>
          ) : recent.length > 0 ? (
            <Paper
              sx={{
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
              elevation={0}
            >
              <List disablePadding>
                {recent.map((apt, idx) => {
                  const dateInfo = formatDateShort(apt.schedule.scheduleDate);
                  return (
                    <ListItemButton
                      key={apt.id}
                      onClick={() => router.push('/patient/appointments')}
                      sx={{
                        p: 2.5,
                        borderBottom: idx < recent.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        transition: 'background 0.2s',
                      }}
                    >
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.text.secondary }}>
                          <i className="ri-heart-pulse-line" style={{ fontSize: 20 }} />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={apt.schedule.specialty.name}
                        secondary={`${dateInfo.day} de ${dateInfo.month}, ${dateInfo.year} • Dr. ${apt.schedule.doctor.name} ${apt.schedule.doctor.lastName}`}
                        primaryTypographyProps={{ fontWeight: 700, color: 'text.primary' }}
                      />
                      <i className="ri-arrow-right-s-line" style={{ fontSize: 20, color: '#94a3b8' }} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          ) : (
            <Paper
              sx={{
                borderRadius: '24px',
                p: 4,
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
              elevation={0}
            >
              <Typography variant="body2" color="text.secondary">
                Aún no tienes atenciones registradas.
              </Typography>
            </Paper>
          )}
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Alerts & Reminders */}
            <Card sx={{ borderRadius: '24px', p: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <i className="ri-notification-3-line" style={{ fontSize: 20, color: theme.palette.text.primary }} />
                  <Typography variant="h6" fontWeight={700}>
                    Alertas y Recordatorios
                  </Typography>
                </Box>

                {nextAppointment ? (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 2,
                      bgcolor: '#fff7ed',
                      border: '1px solid #ffedd5',
                      borderRadius: '16px',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: '#ffedd5',
                        p: 1,
                        borderRadius: '12px',
                        color: '#f97316',
                        height: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="ri-alarm-warning-line" style={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                        Cita próxima
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                        Recuerda asistir a tu cita de {nextAppointment.schedule.specialty.name} el{' '}
                        {formatDate(nextAppointment.schedule.scheduleDate)} a las {nextAppointment.startTime}.
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 2,
                      bgcolor: alpha('#10b981', 0.06),
                      border: '1px solid',
                      borderColor: alpha('#10b981', 0.15),
                      borderRadius: '16px',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: alpha('#10b981', 0.12),
                        p: 1,
                        borderRadius: '12px',
                        color: '#10b981',
                        height: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="ri-check-double-line" style={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                        Todo al día
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                        No tienes alertas pendientes. ¡Sigue cuidando tu salud!
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.12),
                    borderRadius: '16px',
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      p: 1,
                      borderRadius: '12px',
                      color: theme.palette.primary.main,
                      height: 'fit-content',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="ri-file-list-3-line" style={{ fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                      Tu salud importa
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                      Mantén tus consultas al día para un mejor seguimiento médico.
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => router.push('/patient/book')}
                      sx={{ mt: 1, p: 0, minWidth: 'auto', fontWeight: 700 }}
                    >
                      Agendar consulta
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Health Summary Banner */}
            <Card
              sx={{
                borderRadius: '24px',
                bgcolor: '#0f172a',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Glassmorphic decorative circles */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  bgcolor: 'rgba(99, 102, 241, 0.3)',
                  borderRadius: '50%',
                  filter: 'blur(30px)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  width: 80,
                  height: 80,
                  bgcolor: 'rgba(14, 165, 233, 0.2)',
                  borderRadius: '50%',
                  filter: 'blur(25px)',
                }}
              />
              <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                <Chip
                  label="Mi Salud"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    fontWeight: 700,
                    mb: 2,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Portal de Salud
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                  Accede a tu historial médico, resultados y toda tu información de salud en un solo lugar.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => router.push('/patient/profile')}
                  sx={{
                    bgcolor: 'white',
                    color: '#0f172a',
                    borderRadius: '12px',
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  Ver mi perfil
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {!loading && (
              <Card sx={{ borderRadius: '24px' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Resumen
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <i className="ri-calendar-check-line" style={{ fontSize: 18 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          Citas próximas
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} color="primary.main">
                        {upcoming.length}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: alpha('#10b981', 0.04),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: alpha('#10b981', 0.1),
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <i className="ri-check-double-line" style={{ fontSize: 18 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          Completadas
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#10b981' }}>
                        {recent.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
