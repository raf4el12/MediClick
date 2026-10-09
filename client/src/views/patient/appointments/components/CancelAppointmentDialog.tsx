'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { appointmentsService } from '@/services/appointments.service';
import { extractApiError } from '@/utils/extractApiError';
import { formatPrice } from '@/views/booking/format';
import type { Appointment } from '@/views/appointments/types';
import { doctorName, whenLabel } from '../format';

interface CancelAppointmentDialogProps {
  appointment: Appointment;
  onClose: () => void;
  onCancelled: () => void;
}

/** Cancelación con la penalización exacta antes de confirmar (decisión 8 de UI-10). */
export function CancelAppointmentDialog({ appointment, onClose, onCancelled }: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ['patient', 'cancellation-preview', appointment.id],
    queryFn: () => appointmentsService.getCancellationPreview(appointment.id),
    staleTime: 0,
  });

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await appointmentsService.cancel(appointment.id, { reason: reason.trim() });
      onCancelled();
    } catch (err) {
      setError(extractApiError(err, 'No pudimos cancelar la cita').message);
    } finally {
      setSubmitting(false);
    }
  };

  const fee = preview.data?.fee ?? 0;

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='cancel-appointment-title'>
      <DialogTitle id='cancel-appointment-title'>Cancelar la cita</DialogTitle>
      <DialogContent className='flex flex-col gap-4'>
        <Typography>
          {appointment.schedule.specialty.name} con {doctorName(appointment)}, {whenLabel(appointment)}.
        </Typography>
        {preview.isLoading ? (
          <CircularProgress size={22} aria-label='Calculando la penalización' />
        ) : preview.data && fee > 0 ? (
          <Alert severity='warning'>
            Si cancelas ahora se cobrará una penalización de {formatPrice(fee, preview.data.currency)}. Cancelar es gratis hasta{' '}
            {preview.data.freeCancellationWindowHours} h antes de la cita.
          </Alert>
        ) : (
          <Alert severity='info'>Puedes cancelar sin costo.</Alert>
        )}
        {error && <Alert severity='error'>{error}</Alert>}
        <TextField
          label='Motivo de la cancelación'
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 300))}
          multiline
          minRows={2}
          required
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Volver
        </Button>
        <Button variant='contained' onClick={confirm} disabled={submitting || !reason.trim() || preview.data?.cancellable === false}>
          {submitting ? <CircularProgress size={20} color='inherit' aria-label='Cancelando' /> : 'Cancelar cita'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
