'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { appointmentsService } from '@/services/appointments.service';
import { extractApiError } from '@/utils/extractApiError';
import { SlotStep } from '@/views/booking/components/SlotStep';
import { useBooking } from '@/views/booking/useBooking';
import type { Appointment } from '@/views/appointments/types';
import { doctorName } from '../format';

interface RescheduleAppointmentDialogProps {
  appointment: Appointment;
  onClose: () => void;
  onRescheduled: () => void;
}

/**
 * Reagendar con el paso de cupo de la reserva (UI-08), limitado al mismo médico y
 * especialidad: el servidor acepta otros, pero la interfaz no depende de esa laxitud.
 */
export function RescheduleAppointmentDialog({ appointment, onClose, onRescheduled }: RescheduleAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const booking = useBooking('online', {
    preset: {
      clinicId: appointment.clinic?.id,
      specialtyId: appointment.schedule.specialty.id,
      doctorId: appointment.schedule.doctor.id,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slot = booking.state.slot;

  const confirm = async () => {
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    try {
      await appointmentsService.reschedule(appointment.id, {
        newScheduleId: slot.scheduleId,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      onRescheduled();
    } catch (err) {
      const { message, status } = extractApiError(err, 'No pudimos reagendar la cita');
      if (status === 409) {
        booking.dispatch({ type: 'slotTaken' });
        await queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth='md' fullWidth aria-labelledby='reschedule-appointment-title'>
      <DialogTitle id='reschedule-appointment-title'>Reagendar la cita</DialogTitle>
      <DialogContent className='flex flex-col gap-4'>
        <Typography color='text.secondary'>
          {appointment.schedule.specialty.name} con {doctorName(appointment)}. Elige el nuevo día y la hora.
        </Typography>
        {error && <Alert severity='error'>{error}</Alert>}
        {booking.loading.preset ? (
          <CircularProgress aria-label='Cargando los cupos' />
        ) : (
          <SlotStep booking={booking} onChooseOtherDoctor={onClose} allowAlternatives={false} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Volver
        </Button>
        <Button variant='contained' onClick={confirm} disabled={submitting || !slot}>
          {submitting ? <CircularProgress size={20} color='inherit' aria-label='Reagendando' /> : 'Reagendar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
