'use client';

// PROTOTIPO UI-10 — piezas sueltas que reutilizan las variantes (no son layouts).

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { formatDay, formatPrice } from '@/views/booking/format';
import {
  ACTION_ICON,
  ACTION_LABEL,
  PAYMENT_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  dayOffset,
  minutesLeft,
  type ProtoAction,
  type ProtoAppointment,
} from './fixtures';

export function StatusChips({ a }: { a: ProtoAppointment }) {
  return (
    <span className='flex flex-wrap gap-1'>
      <Chip size='small' variant='tonal' color={STATUS_COLOR[a.status]} label={STATUS_LABEL[a.status]} />
      {a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' && (
        <Chip size='small' variant='outlined' label={PAYMENT_LABEL[a.paymentStatus]} />
      )}
    </span>
  );
}

/** "Jueves, 12 de octubre · 09:00 (hora de Lima)". */
export function when(a: ProtoAppointment) {
  const day = formatDay(a.date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${a.start} (hora de ${a.clinic.city})`;
}

export const price = (a: ProtoAppointment, amount = a.amount) => formatPrice(amount, a.clinic.currency);

/** Texto del plazo de pago de una cita pendiente. */
export function deadlineText(a: ProtoAppointment) {
  if (!a.pendingUntil) return null;
  const left = minutesLeft(a.pendingUntil);
  return left > 0 ? `Paga en los próximos ${left} min para conservar el cupo` : 'Venció el plazo de pago';
}

/** Código QR falso (el real vendría de GET /appointments/:id/check-in-qr). */
export function FakeQr({ size = 160 }: { size?: number }) {
  const cells = 21;
  const unit = size / cells;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < cells; y += 1)
    for (let x = 0; x < cells; x += 1) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const on = finder ? x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5) : (x * 7 + y * 13) % 5 < 2;
      if (on) rects.push(<rect key={`${x}-${y}`} x={x * unit} y={y * unit} width={unit} height={unit} />);
    }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role='img' aria-label='Código QR de llegada (simulado)' fill='currentColor'>
      {rects}
    </svg>
  );
}

/** Diálogos que disparan las acciones; `warnPenalty` muestra la penalización antes de cancelar. */
export function useActionDialogs({ warnPenalty = false }: { warnPenalty?: boolean } = {}) {
  const [open, setOpen] = useState<{ action: ProtoAction; a: ProtoAppointment } | null>(null);
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState<string | null>(null);

  const run = (action: ProtoAction, a: ProtoAppointment) => {
    if (action === 'directions') {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(a.clinic.address)}`, '_blank');
      return;
    }
    setDay(0);
    setHour(null);
    setOpen({ action, a });
  };

  const close = () => setOpen(null);
  const a = open?.a;

  const dialog = (
    <Dialog open={!!open} onClose={close} fullWidth maxWidth='xs'>
      {open?.action === 'cancel' && a && (
        <>
          <DialogTitle>Cancelar la cita</DialogTitle>
          <DialogContent className='flex flex-col gap-3'>
            <Typography>
              {a.specialty} con {a.doctor}, {when(a)}.
            </Typography>
            {warnPenalty && a.paymentStatus === 'PAID' && (
              <Alert severity='warning'>
                Si cancelas dentro de las 24 h previas, la sede retiene {price(a, Math.round(a.amount * 0.3))} como penalización.
                (Requiere un endpoint nuevo que la calcule antes de confirmar.)
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Volver</Button>
            <Button color='error' variant='contained' onClick={close}>
              Cancelar cita
            </Button>
          </DialogActions>
        </>
      )}
      {open?.action === 'reschedule' && a && (
        <>
          <DialogTitle>Reagendar con {a.doctor}</DialogTitle>
          <DialogContent className='flex flex-col gap-3'>
            <Typography variant='body2' color='text.secondary'>
              Mismo médico y especialidad; eliges otro cupo (aquí iría el paso de cupo de la reserva).
            </Typography>
            <div className='flex gap-2 overflow-x-auto'>
              {[2, 3, 4, 6, 7].map((d, i) => (
                <Button key={d} size='small' variant={day === i ? 'contained' : 'outlined'} onClick={() => setDay(i)}>
                  {formatDay(dayOffset(d)).split(',')[0]} {dayOffset(d).slice(8)}
                </Button>
              ))}
            </div>
            <div className='flex flex-wrap gap-2'>
              {['08:00', '08:30', '10:00', '11:30'].map((h) => (
                <Button key={h} size='small' variant={hour === h ? 'contained' : 'outlined'} onClick={() => setHour(h)}>
                  {h}
                </Button>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Volver</Button>
            <Button variant='contained' disabled={!hour} onClick={close}>
              Reagendar
            </Button>
          </DialogActions>
        </>
      )}
      {open?.action === 'checkInQr' && a && (
        <>
          <DialogTitle>Código de llegada</DialogTitle>
          <DialogContent className='flex flex-col items-center gap-3 text-center'>
            <FakeQr size={200} />
            <Typography variant='body2' color='text.secondary'>
              Muéstralo en recepción de {a.clinic.name} al llegar. Se habilita desde 1 h antes de la cita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Cerrar</Button>
          </DialogActions>
        </>
      )}
      {open && !['cancel', 'reschedule', 'checkInQr'].includes(open.action) && a && (
        <>
          <DialogTitle>{ACTION_LABEL[open.action]}</DialogTitle>
          <DialogContent>
            <Typography color='text.secondary'>
              {open.action === 'pay' && `Te llevaríamos a Mercado Pago por ${price(a, a.amount - a.paidAmount)}.`}
              {open.action === 'review' && `Calificarías tu atención con ${a.doctor}.`}
              {open.action === 'prescription' && 'Se abriría la receta imprimible (UI-12).'}
              {open.action === 'receipt' && 'Se abriría el comprobante de pago imprimible (UI-12).'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Cerrar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  return { run, dialog };
}

export function ActionButton({ action, onClick, variant = 'outlined' }: { action: ProtoAction; onClick: () => void; variant?: 'outlined' | 'contained' | 'text' }) {
  return (
    <Button size='small' variant={variant} color={action === 'cancel' ? 'error' : 'primary'} startIcon={<i className={ACTION_ICON[action]} />} onClick={onClick}>
      {ACTION_LABEL[action]}
    </Button>
  );
}

export function StatePanel({ state }: { state: unknown }) {
  return (
    <details className='mbs-6 opacity-70'>
      <summary className='cursor-pointer text-sm'>Estado del prototipo</summary>
      <pre className='text-xs overflow-auto'>{JSON.stringify(state, null, 2)}</pre>
    </details>
  );
}
