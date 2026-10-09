'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { formatDay } from '@/views/booking/format';
import { OFFER_TTL_SECONDS } from '../functions/waitlist.constants';
import type { WaitlistOffer } from '../types';

interface OfferCardProps {
  offer: WaitlistOffer;
  onAccept: (offerId: number) => void;
  onReject: (offerId: number) => void;
  accepting: boolean;
  rejecting: boolean;
  /** Se llama una vez, cuando la oferta vence. */
  onExpire: () => void;
}

const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Oferta de cupo: temporal y exclusiva; la cuenta regresiva sale de `expiresAt`. */
export function OfferCard({ offer, onAccept, onReject, accepting, rejecting, onExpire }: OfferCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.floor((new Date(offer.expiresAt).getTime() - now) / 1000));
  const expired = remaining === 0;
  const notified = useRef(false);

  useEffect(() => {
    if (expired) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expired]);

  useEffect(() => {
    if (expired && !notified.current) {
      notified.current = true;
      onExpire();
    }
  }, [expired, onExpire]);

  const urgent = remaining <= 60;
  const busy = accepting || rejecting;
  const day = formatDay(offer.scheduleDate);
  const titleId = `offer-${offer.id}`;

  return (
    <Card component='article' aria-labelledby={titleId} sx={{ borderInlineStart: '4px solid var(--mui-palette-primary-main)' }}>
      <LinearProgress
        variant='determinate'
        value={Math.min(100, (remaining / OFFER_TTL_SECONDS) * 100)}
        color={urgent ? 'warning' : 'primary'}
        aria-label='Tiempo restante para aceptar'
      />
      <CardContent className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div className='flex flex-col gap-1'>
            <Typography id={titleId} variant='caption' color='primary.main' className='uppercase tracking-wide font-medium'>
              Oferta de cupo: {offer.specialtyName}
            </Typography>
            <Typography variant='h6' component='h3' className='first-letter:uppercase'>
              {day}
            </Typography>
            <Typography color='text.primary'>
              {offer.startTime} a {offer.endTime} (hora de la sede)
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {offer.doctorName} · {offer.clinic?.name ?? 'Sede sin nombre'}
            </Typography>
          </div>
          <Typography variant='h6' component='p' color={urgent ? 'warning.main' : 'text.primary'} aria-live='off'>
            {expired ? 'Vencida' : `Vence en ${countdown(remaining)}`}
          </Typography>
        </div>
        {expired && <Alert severity='info'>La oferta venció y el cupo pasó al siguiente paciente.</Alert>}
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='contained'
            disabled={expired || busy}
            onClick={() => onAccept(offer.id)}
            startIcon={accepting ? <CircularProgress size={18} color='inherit' aria-label='Aceptando' /> : undefined}
          >
            Aceptar oferta
          </Button>
          <Button variant='outlined' disabled={expired || busy} onClick={() => onReject(offer.id)}>
            Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
