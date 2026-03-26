'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { getTodayInTimezone, nowInTimezone } from '@/utils/timezone';
import type { Schedule, TimeSlot } from '@/views/schedules/types';
import type { Appointment } from '../types';

interface RescheduleAppointmentDialogProps {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (id: number, newScheduleId: number, startTime: string, endTime: string, reason?: string) => void;
}

/** Buffer mínimo en minutos antes de poder agendar */
const MIN_BUFFER_MINUTES = 120; // 2 horas

import { formatDate as formatDateUtil } from '@/utils/formatDate';
const formatDate = (dateStr: string) => formatDateUtil(dateStr, { weekday: 'long', month: 'long' });

export function RescheduleAppointmentDialog({
  open,
  appointment,
  onClose,
  onConfirm,
}: RescheduleAppointmentDialogProps) {
  // ── State ──
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  // Step 2: time slots for a selected date
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const timezone = appointment?.timezone ?? 'America/Lima';

  // ── Step 1: Fetch available schedule dates ──
  useEffect(() => {
    if (!open || !appointment) return;
    setLoading(true);
    setSelectedDate(null);
    setSelectedSlot(null);
    setTimeSlots([]);
    setReason('');

    const today = getTodayInTimezone(timezone);
    schedulesService
      .findAllPaginated(
        { pageSize: 100 },
        {
          doctorId: appointment.schedule.doctor.id,
          specialtyId: appointment.schedule.specialty.id,
          dateFrom: today,
          onlyAvailable: true,
        },
      )
      .then((res) => {
        // Filter past time blocks on today
        const now = nowInTimezone(timezone);
        const todayStr = today;
        const filtered = res.rows.filter((s) => {
          const dateKey = s.scheduleDate.split('T')[0] ?? s.scheduleDate;
          if (dateKey < todayStr) return false;
          if (dateKey === todayStr) {
            // For today, keep the schedule only if its end time hasn't passed
            const [h, m] = s.timeTo.split(':').map(Number);
            const endMinutes = (h ?? 0) * 60 + (m ?? 0);
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            return endMinutes > nowMinutes + MIN_BUFFER_MINUTES;
          }
          return true;
        });
        setSchedules(filtered);
      })
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, [open, appointment, timezone]);

  // ── Step 2: Fetch time slots when a date is selected ──
  const fetchTimeSlots = useCallback(
    (dateKey: string) => {
      if (!appointment) return;
      setLoadingSlots(true);
      setSelectedSlot(null);

      schedulesService
        .getTimeSlots({
          doctorId: appointment.schedule.doctor.id,
          specialtyId: appointment.schedule.specialty.id,
          date: dateKey,
        })
        .then((slots) => {
          const now = nowInTimezone(timezone);
          const todayStr = getTodayInTimezone(timezone);
          const isToday = dateKey === todayStr;


          // Filter: only available + not past on today
          const filtered = slots.filter((slot) => {
            if (!slot.available) return false;
            if (isToday) {
              const [h, m] = slot.startTime.split(':').map(Number);
              const slotMinutes = (h ?? 0) * 60 + (m ?? 0);
              const nowMinutes = now.getHours() * 60 + now.getMinutes();
              if (slotMinutes - nowMinutes < MIN_BUFFER_MINUTES) return false;
            }
            return true;
          });
          setTimeSlots(filtered);
        })
        .catch(() => setTimeSlots([]))
        .finally(() => setLoadingSlots(false));
    },
    [appointment, timezone],
  );

  const handleDateClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    fetchTimeSlots(dateKey);
  };

  const handleBack = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setTimeSlots([]);
  };

  const handleClose = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setTimeSlots([]);
    setSchedules([]);
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (appointment && selectedSlot) {
      onConfirm(
        appointment.id,
        selectedSlot.scheduleId,
        selectedSlot.startTime,
        selectedSlot.endTime,
        reason || undefined,
      );
      setSelectedDate(null);
      setSelectedSlot(null);
      setReason('');
    }
  };

  // ── Group schedules by date ──
  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>(
    (acc, schedule) => {
      const dateKey = schedule.scheduleDate.split('T')[0] ?? schedule.scheduleDate;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(schedule);
      return acc;
    },
    {},
  );

  // ── Render ──
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {selectedDate && (
          <Button onClick={handleBack} size="small" color="inherit" sx={{ minWidth: 'auto', mr: 1 }}>
            ←
          </Button>
        )}
        Reagendar Cita
      </DialogTitle>
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
        ) : !selectedDate ? (
          /* ── Step 1: Pick a date ── */
          Object.keys(schedulesByDate).length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {Object.entries(schedulesByDate).map(([dateKey, slots]) => (
                <Box
                  key={dateKey}
                  onClick={() => handleDateClick(dateKey)}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {formatDate(dateKey)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {slots.length} bloque{slots.length > 1 ? 's' : ''} disponible{slots.length > 1 ? 's' : ''} · Haz clic para ver horarios
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No hay horarios disponibles para reagendar
            </Typography>
          )
        ) : (
          /* ── Step 2: Pick a time slot ── */
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {formatDate(selectedDate)}
            </Typography>

            {loadingSlots ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : timeSlots.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {timeSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.scheduleId === slot.scheduleId &&
                    selectedSlot?.startTime === slot.startTime;
                  return (
                    <Chip
                      key={`${slot.scheduleId}-${slot.startTime}`}
                      label={`${slot.startTime} - ${slot.endTime}`}
                      onClick={() => setSelectedSlot(slot)}
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Box>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                No hay horarios disponibles en esta fecha
              </Typography>
            )}
          </Box>
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
          disabled={!selectedSlot}
        >
          Reagendar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
