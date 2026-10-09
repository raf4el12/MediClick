'use client';

import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MAX_REASON_LENGTH } from '../model/bookingFlow';
import { formatDay, formatPrice } from '../format';
import type { Booking } from '../useBooking';

// Mismo valor por defecto que `APPOINTMENT_PAYMENT_TIMEOUT_MINUTES` en el servidor.
const PAYMENT_WINDOW_MINUTES = 15;

export function BookingSummaryList({ booking }: { booking: Booking }) {
  const { summary } = booking.view;
  const rows: [string, string | undefined][] = [
    ['Paciente', summary.patient],
    ['Sede', summary.clinic],
    ['Especialidad', summary.specialty],
    ['Médico', summary.doctor],
    ['Fecha', summary.date && formatDay(summary.date)],
    ['Cupo', summary.startTime && `${summary.startTime} a ${summary.endTime}`],
  ];

  return (
    <dl className='flex flex-col gap-3 m-0'>
      {rows
        .filter(([label, value]) => value !== undefined || label !== 'Paciente')
        .map(([label, value]) => (
          <div key={label} className='flex justify-between gap-4'>
            <Typography component='dt' color='text.secondary'>
              {label}
            </Typography>
            <Typography component='dd' color='text.primary' className='m-0 text-end font-medium first-letter:uppercase'>
              {value ?? '—'}
            </Typography>
          </div>
        ))}
      <div className='flex justify-between items-baseline gap-4 pbs-3' style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
        <Typography component='dt' className='font-medium'>
          Total
        </Typography>
        <Typography component='dd' variant='h5' className='m-0'>
          {summary.price !== undefined && summary.currency ? formatPrice(summary.price, summary.currency) : '—'}
        </Typography>
      </div>
    </dl>
  );
}

export function ReviewStep({ booking }: { booking: Booking }) {
  const { state, dispatch } = booking;

  return (
    <div className='grid gap-6 md:grid-cols-2'>
      <div className='flex flex-col gap-4'>
        <TextField
          label='Motivo de la consulta (opcional)'
          multiline
          minRows={3}
          value={state.reason}
          onChange={(e) => dispatch({ type: 'setReason', reason: e.target.value })}
          helperText={`${state.reason.length}/${MAX_REASON_LENGTH}`}
        />
        <Typography variant='body2' color='text.secondary'>
          Al confirmar, el cupo queda reservado {PAYMENT_WINDOW_MINUTES} minutos mientras pagas en Mercado Pago, adonde te
          llevaremos para completar el pago.
        </Typography>
      </div>
      <BookingSummaryList booking={booking} />
    </div>
  );
}
