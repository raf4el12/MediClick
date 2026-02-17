'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { schedulesService } from '@/services/schedules.service';
import type { Schedule } from '@/views/schedules/types';
import type { Appointment } from '../types';

interface RescheduleAppointmentDialogProps {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (id: number, newScheduleId: number, reason?: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function RescheduleAppointmentDialog({
  open,
  appointment,
  onClose,
  onConfirm,
}: RescheduleAppointmentDialogProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open || !appointment) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    schedulesService
      .findAllPaginated(
        { pageSize: 100 },
        {
          doctorId: appointment.schedule.doctor.id,
          specialtyId: appointment.schedule.specialty.id,
          dateFrom: today,
        },
      )
      .then((res) => setSchedules(res.rows))
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, [open, appointment]);

  const handleClose = () => {
    setSelectedScheduleId(null);
    setReason('');
    setSchedules([]);
    onClose();
  };

  const handleConfirm = () => {
    if (appointment && selectedScheduleId) {
      onConfirm(appointment.id, selectedScheduleId, reason || undefined);
      setSelectedScheduleId(null);
      setReason('');
    }
  };

  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>(
    (acc, schedule) => {
      const dateKey = schedule.scheduleDate.split('T')[0] ?? schedule.scheduleDate;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(schedule);
      return acc;
    },
    {},
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Reagendar Cita</DialogTitle>
      <DialogContent>
        {appointment && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reagendar cita de {appointment.patient.name} {appointment.patient.lastName}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : Object.keys(schedulesByDate).length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {Object.entries(schedulesByDate).map(([dateKey, slots]) => (
              <Box key={dateKey}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {formatDate(dateKey)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {slots.map((slot) => (
                    <Chip
                      key={slot.id}
                      label={`${slot.timeFrom} - ${slot.timeTo}`}
                      onClick={() => setSelectedScheduleId(slot.id)}
                      color={selectedScheduleId === slot.id ? 'primary' : 'default'}
                      variant={selectedScheduleId === slot.id ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No hay horarios disponibles
          </Typography>
        )}

        <TextField
          fullWidth
          size="small"
          label="Motivo del reagendamiento (opcional)"
          multiline
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedScheduleId}
        >
          Reagendar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
