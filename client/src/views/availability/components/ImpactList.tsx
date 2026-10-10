'use client';

import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

const PAYMENT: Record<string, string> = { PAID: 'Pagada', PARTIAL: 'Con seña', PENDING: 'Sin pagar' };

export interface ImpactRow {
  id: number;
  date: string;
  startTime: string;
  patient: { fullName: string };
  specialtyName: string;
  doctorName?: string;
  paymentStatus: string;
}

interface ImpactListProps {
  rows: ImpactRow[] | undefined;
  loading?: boolean;
  /** `true`: la restricción cancela estas citas (las pagadas quedan con reembolso pendiente). */
  cancels: boolean;
  withDoctor?: boolean;
  empty: string;
}

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

/** Citas que una restricción o un cambio de reglas afectaría, con su estado de pago. */
export default function ImpactList({ rows, loading, cancels, withDoctor, empty }: ImpactListProps) {
  if (loading && !rows) return <Skeleton variant='rounded' height={72} />;
  // `status` y no `alert`: la lista cambia con cada edición y no debe interrumpir al lector de pantalla.
  if (!rows || rows.length === 0) return <Alert severity='success' role='status'>{empty}</Alert>;

  const one = rows.length === 1;
  const paid = rows.filter((r) => r.paymentStatus === 'PAID' || r.paymentStatus === 'PARTIAL').length;
  const summary = cancels
    ? `${rows.length} ${one ? 'cita se cancelaría' : 'citas se cancelarían'}${paid > 0 ? `; ${paid} con pago ${paid === 1 ? 'queda' : 'quedan'} con reembolso pendiente` : ''}.`
    : `${rows.length} ${one ? 'cita queda' : 'citas quedan'} fuera de las nuevas reglas. No se cancelan: conservan su cupo.`;

  return (
    <Alert severity='warning' icon={false} role='status'>
      <Typography className='font-medium mbe-2'>{summary}</Typography>
      <ul className='flex flex-col gap-2 m-0 p-0 list-none'>
        {rows.map((r) => (
          <li key={r.id} className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <Typography variant='body2' className='font-medium tabular-nums'>
              {dayLabel(r.date)} · {r.startTime}
            </Typography>
            <Typography variant='body2'>
              {r.patient.fullName} ({withDoctor && r.doctorName ? `${r.doctorName}, ` : ''}
              {r.specialtyName})
            </Typography>
            <Chip size='small' variant='outlined' label={PAYMENT[r.paymentStatus] ?? r.paymentStatus} />
          </li>
        ))}
      </ul>
    </Alert>
  );
}
