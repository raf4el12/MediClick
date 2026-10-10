'use client';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AgendaStatusChips from '@/views/agenda/components/AgendaStatusChips';
import type { AgendaAppointment } from '@/views/agenda/types';

interface JornadaListProps {
  appointments: AgendaAppointment[];
  specialtyName: (specialtyId: number) => string;
  loading: boolean;
  error: boolean;
  selectedId: number | null;
  onSelect: (appointment: AgendaAppointment) => void;
}

/** Citas del día por hora; tocar una la abre en el espacio de atención. */
export default function JornadaList({ appointments, specialtyName, loading, error, selectedId, onSelect }: JornadaListProps) {
  return (
    <Card component='section' aria-labelledby='jornada-citas'>
      <CardHeader title='Citas de hoy' slotProps={{ title: { id: 'jornada-citas', component: 'h2' } }} />
      {error && (
        <Alert severity='error' className='mli-5 mbe-5'>
          No se pudo cargar la jornada. Vuelve a intentarlo en unos minutos.
        </Alert>
      )}
      {loading && (
        <div className='flex flex-col gap-2 pli-5 pbe-5'>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} variant='rounded' height={64} />
          ))}
        </div>
      )}
      {!loading && !error && appointments.length === 0 && (
        <Typography color='text.secondary' className='pli-5 pbe-5'>
          No tienes citas hoy.
        </Typography>
      )}
      {appointments.length > 0 && (
        <ul className='m-0 p-0 list-none'>
          {appointments.map((a) => {
            const selected = a.id === selectedId;
            return (
              <li key={a.id} style={{ borderBlockStart: '1px solid var(--mui-palette-divider)' }}>
                <button
                  type='button'
                  aria-pressed={selected}
                  onClick={() => onSelect(a)}
                  className='flex items-start gap-4 is-full pli-5 plb-3 text-start border-0 cursor-pointer'
                  style={{
                    font: 'inherit',
                    color: 'inherit',
                    background: selected ? 'var(--mui-palette-action-selected)' : 'transparent',
                  }}
                >
                  <Typography className='font-medium is-12 shrink-0 tabular-nums'>{a.startTime}</Typography>
                  <span className='flex flex-col gap-1 min-is-0'>
                    <Typography color='text.primary' className='font-medium'>
                      {a.patient.fullName}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {specialtyName(a.specialtyId)}
                    </Typography>
                    <AgendaStatusChips appointment={a} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
