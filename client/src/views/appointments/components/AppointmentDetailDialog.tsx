'use client';

import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import { type Appointment, AppointmentStatus } from '../types';

interface AppointmentDetailDialogProps {
  appointment: Appointment | null;
  onClose: () => void;
}

const statusConfig: Record<
  AppointmentStatus,
  { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default' }
> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'info' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En progreso', color: 'primary' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'success' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'error' },
  [AppointmentStatus.NO_SHOW]: { label: 'No asistió', color: 'default' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function AppointmentDetailDialog({
  appointment,
  onClose,
}: AppointmentDetailDialogProps) {
  const theme = useTheme();

  if (!appointment) return null;

  const config = statusConfig[appointment.status] ?? {
    label: appointment.status,
    color: 'default' as const,
  };

  const infoItems = [
    {
      icon: 'ri-user-line',
      label: 'Paciente',
      value: `${appointment.patient.name} ${appointment.patient.lastName}`,
    },
    {
      icon: 'ri-mail-line',
      label: 'Email',
      value: appointment.patient.email,
    },
    {
      icon: 'ri-user-heart-line',
      label: 'Doctor',
      value: `Dr. ${appointment.schedule.doctor.name} ${appointment.schedule.doctor.lastName}`,
    },
    {
      icon: 'ri-stethoscope-line',
      label: 'Especialidad',
      value: appointment.schedule.specialty.name,
    },
    {
      icon: 'ri-calendar-line',
      label: 'Fecha',
      value: formatDate(appointment.schedule.scheduleDate),
    },
    {
      icon: 'ri-time-line',
      label: 'Hora',
      value: `${appointment.schedule.timeFrom} - ${appointment.schedule.timeTo}`,
    },
  ];

  return (
    <Card
      sx={{
        height: 'fit-content',
        position: 'sticky',
        top: 80,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Detalle de la Cita
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 3 }}>
        {/* Status */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Chip label={config.label} color={config.color} />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Info Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {infoItems.map((item) => (
            <Box
              key={item.label}
              sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <i className={item.icon} style={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {item.label}
                </Typography>
                <Typography variant="body2">{item.value}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Reason */}
        {appointment.reason && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <i
                  className="ri-file-text-line"
                  style={{ fontSize: 16, color: theme.palette.info.main }}
                />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Motivo de consulta
                </Typography>
              </Box>
              <Typography variant="body2">{appointment.reason}</Typography>
            </Box>
          </>
        )}

        {/* Notes */}
        {appointment.notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <i
                  className="ri-sticky-note-line"
                  style={{ fontSize: 16, color: theme.palette.warning.main }}
                />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Notas
                </Typography>
              </Box>
              <Typography variant="body2">{appointment.notes}</Typography>
            </Box>
          </>
        )}

        {/* Cancel Reason */}
        {appointment.cancelReason && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <i
                  className="ri-close-circle-line"
                  style={{ fontSize: 16, color: theme.palette.error.main }}
                />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Motivo de cancelación
                </Typography>
              </Box>
              <Typography variant="body2">{appointment.cancelReason}</Typography>
            </Box>
          </>
        )}

        {/* Created At */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Registrada el {formatDate(appointment.createdAt)}
        </Typography>
      </Box>
    </Card>
  );
}
