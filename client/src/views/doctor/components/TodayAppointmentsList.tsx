'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';
import type { Appointment } from '@/views/appointments/types';
import { AppointmentStatus } from '@/views/appointments/types';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'default'; icon: string }> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning', icon: 'ri-time-line' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'info', icon: 'ri-check-line' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En Consulta', color: 'info', icon: 'ri-stethoscope-line' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'success', icon: 'ri-check-double-line' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'error', icon: 'ri-close-circle-line' },
  [AppointmentStatus.NO_SHOW]: { label: 'No asistió', color: 'default', icon: 'ri-user-unfollow-line' },
};

interface TodayAppointmentsListProps {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  onSelect: (appointment: Appointment) => void;
}

export function TodayAppointmentsList({
  appointments,
  loading,
  error,
  selectedId,
  onSelect,
}: TodayAppointmentsListProps) {
  const theme = useTheme();

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <i className="ri-calendar-line" style={{ fontSize: 48, opacity: 0.3 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            No tienes citas programadas para hoy
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Las citas aparecerán aquí cuando sean agendadas
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {appointments.map((apt) => {
        const config = STATUS_CONFIG[apt.status];
        const isSelected = selectedId === apt.id;
        const isActionable = apt.status === AppointmentStatus.IN_PROGRESS;

        return (
          <Card
            key={apt.id}
            onClick={() => onSelect(apt)}
            sx={{
              cursor: 'pointer',
              transition: 'all 200ms ease',
              border: '2px solid',
              borderColor: isSelected ? 'primary.main' : 'transparent',
              bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : undefined,
              ...(isActionable && !isSelected && {
                borderColor: alpha(theme.palette.info.main, 0.3),
                bgcolor: alpha(theme.palette.info.main, 0.02),
              }),
              '&:hover': {
                transform: 'translateX(4px)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                borderColor: isSelected ? 'primary.main' : 'divider',
              },
            }}
          >
            <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Time block */}
                <Box
                  sx={{
                    textAlign: 'center',
                    minWidth: 64,
                    py: 1,
                    px: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ lineHeight: 1 }}>
                    {apt.startTime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {apt.endTime}
                  </Typography>
                </Box>

                {/* Patient info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {apt.patient.name} {apt.patient.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {apt.schedule.specialty.name}
                  </Typography>
                  {apt.reason && (
                    <Typography variant="caption" color="text.disabled" noWrap>
                      {apt.reason}
                    </Typography>
                  )}
                </Box>

                {/* Status */}
                <Chip
                  label={config.label}
                  color={config.color}
                  size="small"
                  variant={apt.status === AppointmentStatus.IN_PROGRESS ? 'filled' : 'outlined'}
                  icon={<i className={config.icon} style={{ fontSize: 14 }} />}
                  sx={{ flexShrink: 0 }}
                />

                {/* Action hint */}
                <i
                  className="ri-arrow-right-s-line"
                  style={{ fontSize: 20, color: theme.palette.text.disabled, flexShrink: 0 }}
                />
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
