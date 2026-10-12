'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { historyCounts } from '../functions/historyCounts';
import type { MedicalHistory } from '../types';

interface MedicalHistoryStatsProps {
  entries: MedicalHistory[];
  total: number;
}

/** Tarjetas de resumen (patrón `card-statistics/HorizontalWithSubtitle` de Materio, sin tendencia). */
export function MedicalHistoryStats({ entries, total }: MedicalHistoryStatsProps) {
  const { active, chronic, resolved } = historyCounts(entries);
  const items = [
    { title: 'Total de entradas', value: total, subtitle: 'En el historial del paciente', icon: 'ri-file-list-3-line', color: 'primary' as const },
    { title: 'Activas', value: active, subtitle: 'En esta página', icon: 'ri-pulse-line', color: 'info' as const },
    { title: 'Crónicas', value: chronic, subtitle: 'En esta página', icon: 'ri-heart-pulse-line', color: 'warning' as const },
    { title: 'Resueltas', value: resolved, subtitle: 'En esta página', icon: 'ri-check-double-line', color: 'success' as const },
  ];

  return (
    <section aria-label='Resumen del historial' className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {items.map((item) => (
        <Card key={item.title}>
          <CardContent className='flex justify-between gap-1'>
            <div className='flex flex-col gap-1 flex-grow'>
              <Typography color='text.primary'>{item.title}</Typography>
              <Typography variant='h4'>{item.value}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {item.subtitle}
              </Typography>
            </div>
            <CustomAvatar color={item.color} skin='light' variant='rounded' size={42}>
              <i className={`${item.icon} text-[26px]`} aria-hidden />
            </CustomAvatar>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
