'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import type { MyAppointmentsSummary } from '@/views/appointments/types';

function Stat({ icon, color, title, value, subtitle }: { icon: string; color: 'primary' | 'warning' | 'info' | 'success'; title: string; value: number; subtitle: string }) {
  return (
    <Card>
      <CardContent className='flex justify-between gap-2'>
        <div className='flex flex-col gap-1'>
          <Typography color='text.primary'>{title}</Typography>
          <Typography variant='h4' component='p'>
            {value}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        </div>
        <CustomAvatar color={color} skin='light' variant='rounded' size={42} aria-hidden='true'>
          <i className={`${icon} text-[26px]`} />
        </CustomAvatar>
      </CardContent>
    </Card>
  );
}

/** Indicadores de Inicio (decisión 1 de UI-10), tomados de `GET /appointments/my/summary`. */
export function PatientStats({ summary }: { summary: MyAppointmentsSummary }) {
  // El plazo se calcula contra el momento en que se cargó el resumen.
  const [loadedAt] = useState(() => Date.now());
  const minutesLeft = summary.earliestPaymentDeadline
    ? Math.max(0, Math.round((new Date(summary.earliestPaymentDeadline).getTime() - loadedAt) / 60_000))
    : null;

  return (
    <section aria-label='Resumen de tus citas' className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
      <Stat icon='ri-calendar-check-line' color='primary' title='Próximas citas' value={summary.upcomingCount} subtitle='En todas tus sedes' />
      <Stat
        icon='ri-bank-card-line'
        color='warning'
        title='Por pagar'
        value={summary.awaitingPaymentCount}
        subtitle={minutesLeft !== null ? `La primera vence en ${minutesLeft} min` : 'Nada pendiente'}
      />
      <Stat icon='ri-star-line' color='info' title='Reseñas pendientes' value={summary.pendingReviewCount} subtitle='De citas completadas' />
      <Stat icon='ri-checkbox-circle-line' color='success' title='Completadas' value={summary.completedCount} subtitle='Desde que te registraste' />
    </section>
  );
}
