'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import type { AgendaIndicators } from '@/views/agenda/types';

/** Indicadores de la jornada (patrón `card-statistics` de Materio), tal como los calcula `GET /agenda`. */
export default function JornadaIndicators({ indicators }: { indicators: AgendaIndicators | undefined }) {
  const items = indicators
    ? [
        { icon: 'ri-pie-chart-line', color: 'primary' as const, title: 'Ocupación', value: `${Math.round(indicators.occupancyRate * 100)} %`, sub: `${indicators.bookedCupos} de ${indicators.totalCupos} cupos` },
        { icon: 'ri-user-follow-line', color: 'success' as const, title: 'Atendidas', value: String(indicators.byStatus.COMPLETED), sub: `${indicators.byStatus.CONFIRMED} confirmadas por atender` },
        { icon: 'ri-alarm-warning-line', color: 'error' as const, title: 'En riesgo', value: String(indicators.atRisk), sub: 'Pueden no presentarse' },
        { icon: 'ri-bank-card-line', color: 'warning' as const, title: 'Pago pendiente', value: String(indicators.pendingPayment), sub: 'Con plazo de pago vigente' },
      ]
    : [];

  return (
    <section aria-label='Indicadores de hoy' className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {indicators
        ? items.map((item) => (
            <Card key={item.title}>
              <CardContent className='flex justify-between gap-2'>
                <div className='flex flex-col gap-1'>
                  <Typography color='text.primary'>{item.title}</Typography>
                  <Typography variant='h4'>{item.value}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {item.sub}
                  </Typography>
                </div>
                <CustomAvatar color={item.color} skin='light' variant='rounded' size={42}>
                  <i className={`${item.icon} text-[26px]`} aria-hidden />
                </CustomAvatar>
              </CardContent>
            </Card>
          ))
        : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant='rounded' height={118} />)}
    </section>
  );
}
