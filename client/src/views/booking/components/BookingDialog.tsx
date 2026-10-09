'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MAX_REASON_LENGTH } from '../model/bookingFlow';
import { useBooking } from '../useBooking';
import { PatientStep } from './PatientStep';
import { BookingSummaryList } from './ReviewStep';
import { SlotStep } from './SlotStep';

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Creación administrativa: una sola pantalla con el paciente primero (decisión de UI-06). */
export function BookingDialog({ open, onClose, onCreated }: BookingDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md' aria-labelledby='booking-dialog-title'>
      {/* Se monta al abrir: cada apertura empieza una reserva nueva. */}
      {open && <BookingDialogContent onClose={onClose} onCreated={onCreated} />}
    </Dialog>
  );
}

function BookingDialogContent({ onClose, onCreated }: Omit<BookingDialogProps, 'open'>) {
  const booking = useBooking('administrative');
  const { state, view, options, loading, dispatch } = booking;

  const create = async () => {
    const result = await booking.submit();
    if (result?.kind === 'created') {
      onCreated();
      onClose();
    }
  };

  return (
    <>
      <DialogTitle id='booking-dialog-title'>Nueva cita</DialogTitle>
      <DialogContent className='flex flex-col gap-5'>
        {booking.error && <Alert severity='error'>{booking.error}</Alert>}
        <div className='pbs-2'>
          <PatientStep booking={booking} autoFocus />
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          <TextField
            select
            label='Especialidad'
            value={state.specialty?.id ?? ''}
            disabled={loading.specialties}
            onChange={(e) => {
              const option = options.specialties.find((s) => s.id === Number(e.target.value));
              if (option) dispatch({ type: 'select', field: 'specialty', option });
            }}
          >
            {options.specialties.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            id='booking-doctor'
            label='Médico'
            value={state.doctor?.id ?? ''}
            disabled={!state.specialty || loading.doctors}
            onChange={(e) => {
              const option = options.doctors.find((d) => d.id === Number(e.target.value));
              if (option) dispatch({ type: 'select', field: 'doctor', option });
            }}
          >
            {options.doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        {state.doctor ? (
          <SlotStep booking={booking} onChooseOtherDoctor={() => document.getElementById('booking-doctor')?.focus()} />
        ) : (
          <Typography color='text.secondary'>Elige especialidad y médico para ver los cupos.</Typography>
        )}
        <TextField
          label='Motivo (opcional)'
          value={state.reason}
          onChange={(e) => dispatch({ type: 'setReason', reason: e.target.value })}
          helperText={`${state.reason.length}/${MAX_REASON_LENGTH}`}
        />
        <BookingSummaryList booking={booking} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={booking.submitting}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={create} disabled={booking.submitting || view.missing.length > 0}>
          {booking.submitting ? <CircularProgress size={22} color='inherit' aria-label='Creando' /> : 'Crear cita'}
        </Button>
      </DialogActions>
    </>
  );
}
