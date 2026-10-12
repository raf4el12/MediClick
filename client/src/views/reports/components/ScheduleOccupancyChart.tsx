'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import Typography from '@mui/material/Typography';
import type { ScheduleOccupancy } from '../types';
import ChartCard from './ChartCard';

interface ScheduleOccupancyChartProps {
  occupancy: ScheduleOccupancy | null;
  loading: boolean;
}

export default function ScheduleOccupancyChart({ occupancy, loading }: ScheduleOccupancyChartProps) {
  const rate = occupancy?.occupancyRate ?? 0;
  // El arco cambia de color según la ocupación; el número va en el color del texto para llegar a AA.
  const color = rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error';
  const description = occupancy
    ? `Ocupación de cupos del mes: ${rate} %, ${occupancy.bookedSlots} de ${occupancy.totalSlots} cupos reservados.`
    : 'Ocupación de cupos sin datos.';

  return (
    <ChartCard title='Ocupación de cupos' subheader='Porcentaje del mes' loading={loading} empty={!occupancy} description={description}>
      <div className='relative bs-full'>
        <ResponsiveContainer width='100%' height='100%'>
          <RadialBarChart cx='50%' cy='50%' innerRadius='70%' outerRadius='90%' startAngle={225} endAngle={-45} data={[{ value: rate }]}>
            <PolarAngleAxis type='number' domain={[0, 100]} tick={false} />
            <RadialBar dataKey='value' cornerRadius={8} fill={`var(--mui-palette-${color}-main)`} background={{ fill: 'var(--mui-palette-action-hover)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className='absolute inset-0 flex flex-col items-center justify-center'>
          <Typography variant='h4'>{rate} %</Typography>
          {occupancy && (
            <Typography variant='body2' color='text.secondary'>
              {occupancy.bookedSlots} de {occupancy.totalSlots} cupos
            </Typography>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
