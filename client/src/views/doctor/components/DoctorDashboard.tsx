'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { useDoctorDashboard } from '../hooks/useDoctorDashboard';
import { DoctorStatCards } from './DoctorStatCards';
import { TodayAppointmentsList } from './TodayAppointmentsList';
import { AppointmentWorkspaceDialog } from './AppointmentWorkspaceDialog';

const TODAY_LABEL = new Date().toLocaleDateString('es-PE', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function DoctorDashboard() {
  const user = useAppSelector(selectUser);
  const theme = useTheme();
  const controller = useDoctorDashboard();

  const quickActions = [
    {
      label: 'Notas Clínicas',
      description: 'Historial de notas por cita',
      icon: 'ri-file-text-line',
      href: '/clinical-notes',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.08),
    },
    {
      label: 'Recetas',
      description: 'Gestionar prescripciones',
      icon: 'ri-medicine-bottle-line',
      href: '/prescriptions',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.08),
    },
    {
      label: 'Historial Médico',
      description: 'Ver historial de pacientes',
      icon: 'ri-file-list-3-line',
      href: '/medical-history',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.08),
    },
    {
      label: 'Mi Disponibilidad',
      description: 'Configurar horarios',
      icon: 'ri-calendar-event-line',
      href: '/availability',
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
          backgroundImage: 'url(/images/dashboard-hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.dark, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.4)} 100%)`,
            zIndex: 0,
          },
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
        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 4 } }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 0.5 }}>
            {TODAY_LABEL}
          </Typography>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Hola, Dr. {user?.name ?? 'Doctor'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
            {controller.stats.total === 0
              ? 'No tienes citas programadas para hoy'
              : `Tienes ${controller.stats.total} cita${controller.stats.total > 1 ? 's' : ''} programada${controller.stats.total > 1 ? 's' : ''} para hoy`}
          </Typography>
        </CardContent>
      </Card>

      {/* Stats */}
      <Box sx={{ mb: 3 }}>
        <DoctorStatCards stats={controller.stats} loading={controller.loadingAppointments} />
      </Box>

      {/* Main content */}
      <Grid container spacing={3}>
        {/* Today's appointments */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1rem' }}>
              Citas de Hoy
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {controller.appointments.length} cita{controller.appointments.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <TodayAppointmentsList
            appointments={controller.appointments}
            loading={controller.loadingAppointments}
            error={controller.appointmentsError}
            selectedId={controller.selectedAppointment?.id ?? null}
            onSelect={controller.selectAppointment}
          />
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
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
      </Grid>

      {/* Appointment Workspace Dialog */}
      <AppointmentWorkspaceDialog
        appointment={controller.selectedAppointment}
        notes={controller.notes}
        prescription={controller.prescription}
        loadingNotes={controller.loadingNotes}
        loadingPrescription={controller.loadingPrescription}
        actionLoading={controller.actionLoading}
        actionError={controller.actionError}
        onClose={controller.clearSelection}
        onComplete={controller.completeAppointment}
        onCreateNote={controller.createNote}
        onCreatePrescription={controller.createPrescription}
      />
    </Box>
  );
}
