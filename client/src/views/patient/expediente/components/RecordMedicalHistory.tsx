'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import type { PatientRecordMedicalHistory } from '../types';

export const HISTORY_STATUS: Record<string, { label: string; color: 'success' | 'warning' | 'info'; icon: string }> = {
  ACTIVE: { label: 'Activo', color: 'warning', icon: 'ri-error-warning-line' },
  CHRONIC: { label: 'Crónico', color: 'info', icon: 'ri-heart-pulse-line' },
  RESOLVED: { label: 'Resuelto', color: 'success', icon: 'ri-check-line' },
};

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

/** Pestaña "Antecedentes": el historial médico del paciente. */
export default function RecordMedicalHistory({ history }: { history: PatientRecordMedicalHistory[] }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color='text.secondary'>No hay antecedentes registrados.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className='grid gap-6 m-0 p-0 list-none md:grid-cols-2'>
      {history.map((item, index) => {
        const status = HISTORY_STATUS[item.status ?? ''] ?? { label: item.status ?? 'Sin estado', color: 'info' as const, icon: 'ri-information-line' };
        return (
          <li key={`${item.condition}-${index}`}>
            <Card className='bs-full'>
              <CardContent className='flex flex-col gap-2'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-center gap-3'>
                    <CustomAvatar variant='rounded' skin='light' color={status.color} size={36} aria-hidden>
                      <i className={status.icon} />
                    </CustomAvatar>
                    <Typography variant='h6' component='h3'>
                      {item.condition}
                    </Typography>
                  </div>
                  <Chip size='small' variant='tonal' color={status.color} label={status.label} />
                </div>
                {item.description && <Typography>{item.description}</Typography>}
                {item.notes && <Typography color='text.secondary'>{item.notes}</Typography>}
                {item.diagnosedDate && (
                  <Typography variant='body2' color='text.secondary'>
                    Diagnosticado el {dayLabel(item.diagnosedDate)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
