'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyCount } from '../types';
import ChartCard from './ChartCard';

interface AppointmentsTrendChartProps {
  daily: DailyCount[];
  loading: boolean;
  title?: string;
}

/** Descripción para lectores de pantalla: total, días con citas y el día con más citas. */
export function describeDaily(daily: DailyCount[]): string {
  const total = daily.reduce((sum, d) => sum + d.count, 0);
  const max = daily.reduce<DailyCount | null>((best, d) => (!best || d.count > best.count ? d : best), null);
  return `Citas por día del mes: ${total} citas en ${daily.length} días${max ? `; el día con más citas fue el ${Number(max.date.slice(8))} (${max.count})` : ''}.`;
}

export default function AppointmentsTrendChart({ daily, loading, title = 'Citas por día' }: AppointmentsTrendChartProps) {
  const data = daily.map((d) => ({ ...d, label: String(Number(d.date.slice(8))) }));

  return (
    <ChartCard title={title} subheader='Evolución diaria del mes' loading={loading} empty={data.length === 0} description={describeDaily(daily)}>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} />
          <XAxis dataKey='label' axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [value as number, 'Citas']} labelFormatter={(label) => `Día ${label}`} />
          <Bar dataKey='count' name='Citas' fill='var(--mui-palette-primary-main)' radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
