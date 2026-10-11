'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { PatientRecord } from '../types';
import { HISTORY_STATUS } from './RecordMedicalHistory';

const split = (value?: string) => (value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []);

function ChipGroup({ title, items, empty, color }: { title: string; items: string[]; empty: string; color: 'error' | 'warning' }) {
  return (
    <section className='flex flex-col gap-2'>
      <Typography variant='h6' component='h3'>
        {title}
      </Typography>
      {items.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {items.map((item) => (
            <Chip key={item} size='small' variant='tonal' color={color} label={item} />
          ))}
        </div>
      ) : (
        <Typography color='text.secondary'>{empty}</Typography>
      )}
    </section>
  );
}

/** Pestaña "Resumen": lo clínico que hay que tener a la vista antes de atender. */
export default function RecordGeneralInfo({ record }: { record: PatientRecord }) {
  const active = (record.medicalHistory ?? []).filter((h) => h.status !== 'RESOLVED');

  return (
    <Card>
      <CardHeader title='Información médica' subheader={record.bloodType ? `Tipo de sangre ${record.bloodType}` : 'Tipo de sangre sin registrar'} />
      <CardContent className='flex flex-col gap-6'>
        <ChipGroup title='Alergias' items={split(record.allergies)} empty='Sin alergias registradas.' color='error' />
        <ChipGroup title='Condiciones crónicas' items={split(record.chronicConditions)} empty='Sin condiciones crónicas registradas.' color='warning' />
        <section className='flex flex-col gap-2'>
          <Typography variant='h6' component='h3'>
            Condiciones activas
          </Typography>
          {active.length > 0 ? (
            <ul className='flex flex-col gap-2 m-0 p-0 list-none'>
              {active.map((h, i) => {
                const status = HISTORY_STATUS[h.status ?? ''];
                return (
                  <li key={`${h.condition}-${i}`} className='flex flex-wrap items-center gap-2'>
                    <Typography color='text.primary'>{h.condition}</Typography>
                    {status && <Chip size='small' variant='tonal' color={status.color} label={status.label} />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Typography color='text.secondary'>Sin condiciones activas.</Typography>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
