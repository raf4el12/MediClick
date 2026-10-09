'use client';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { TIME_PREFERENCE_LABELS } from '../functions/waitlist.schema';
import { WaitlistEntryStatus, type WaitlistEntry } from '../types';

interface WaitlistEntryCardProps {
  entry: WaitlistEntry;
  /** Sin `onLeave` la entrada es del historial y no se puede dejar. */
  onLeave?: (entry: WaitlistEntry) => void;
}

const STATUS_CONFIG: Record<WaitlistEntryStatus, { label: string; color: 'success' | 'info' | 'secondary' | 'warning' }> = {
  [WaitlistEntryStatus.ACTIVE]: { label: 'En espera', color: 'success' },
  [WaitlistEntryStatus.FULFILLED]: { label: 'Cumplida', color: 'info' },
  [WaitlistEntryStatus.CANCELLED]: { label: 'Cancelada', color: 'secondary' },
  [WaitlistEntryStatus.EXPIRED]: { label: 'Vencida', color: 'warning' },
};

const day = (iso: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso));

/** Entrada en lista de espera: qué busca el paciente, dónde y cuándo. */
export function WaitlistEntryCard({ entry, onLeave }: WaitlistEntryCardProps) {
  const status = STATUS_CONFIG[entry.status];
  const titleId = `waitlist-entry-${entry.id}`;

  return (
    <Card component='article' aria-labelledby={titleId}>
      <CardContent className='flex flex-wrap items-start gap-4'>
        <CustomAvatar color='primary' skin='light' variant='rounded' size={44} aria-hidden='true'>
          <i className='ri-time-line text-[22px]' />
        </CustomAvatar>
        <div className='flex flex-col gap-1 flex-1 min-is-0'>
          <Typography variant='caption' color='text.secondary' className='uppercase tracking-wide'>
            Entrada en lista de espera
          </Typography>
          <div className='flex flex-wrap items-center gap-2'>
            <Typography id={titleId} variant='h6' component='h3'>
              {entry.specialtyName}
            </Typography>
            <Chip size='small' variant='tonal' color={status.color} label={status.label} />
          </div>
          <Typography color='text.primary'>{entry.doctorName ?? 'Cualquier médico'}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {entry.clinicName ?? 'Sin sede'} · Del {day(entry.dateFrom)} al {day(entry.dateTo)} · {TIME_PREFERENCE_LABELS[entry.timePreference]}
          </Typography>
        </div>
        {onLeave && entry.status === WaitlistEntryStatus.ACTIVE && (
          <Button variant='outlined' onClick={() => onLeave(entry)}>
            Salir de la lista
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
