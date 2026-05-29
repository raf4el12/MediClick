'use client';

import { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import { OFFER_TTL_SECONDS } from '../functions/waitlist.constants';
import type { WaitlistOffer } from '../types';

interface OfferCardProps {
  offer: WaitlistOffer;
  onAccept: (offerId: number) => void;
  onReject: (offerId: number) => void;
  accepting: boolean;
  rejecting: boolean;
  onExpire: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSlot(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const date = start.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${date}, ${start.toLocaleTimeString('es-PE', opts)} - ${end.toLocaleTimeString('es-PE', opts)}`;
}

export function OfferCard({
  offer,
  onAccept,
  onReject,
  accepting,
  rejecting,
  onExpire,
}: OfferCardProps) {
  const [remaining, setRemaining] = useState(offer.secondsRemaining);

  useEffect(() => {
    setRemaining(offer.secondsRemaining);
  }, [offer.secondsRemaining, offer.id]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  const expired = remaining <= 0;
  const urgent = remaining <= 60;
  const progress = Math.min(100, (remaining / OFFER_TTL_SECONDS) * 100);
  const busy = accepting || rejecting;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: urgent ? 'error.main' : 'primary.main',
        borderWidth: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <LinearProgress
        variant="determinate"
        value={progress}
        color={urgent ? 'error' : 'primary'}
        sx={{ height: 4 }}
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="primary.main" fontWeight={700}>
              ¡Cupo disponible!
            </Typography>
            <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
              {offer.specialtyName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              <i className="ri-calendar-event-line" style={{ fontSize: 14, marginRight: 6 }} />
              {formatSlot(offer.startTime, offer.endTime)}
            </Typography>
          </Box>
          <Chip
            icon={<i className="ri-timer-line" style={{ fontSize: 16 }} />}
            label={expired ? 'Expirada' : formatCountdown(remaining)}
            color={expired ? 'default' : urgent ? 'error' : 'primary'}
            variant={urgent ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
          <Button
            variant="contained"
            fullWidth
            disabled={busy || expired}
            onClick={() => onAccept(offer.id)}
            startIcon={accepting ? <CircularProgress size={18} /> : <i className="ri-check-line" />}
          >
            {accepting ? 'Reservando…' : 'Aceptar y pagar'}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            disabled={busy || expired}
            onClick={() => onReject(offer.id)}
            startIcon={rejecting ? <CircularProgress size={18} /> : <i className="ri-close-line" />}
          >
            Rechazar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
