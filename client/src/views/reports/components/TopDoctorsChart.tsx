'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TopDoctor } from '../types';
import ChartCard from './ChartCard';

interface TopDoctorsChartProps {
  topDoctors: TopDoctor[];
  loading: boolean;
}

export default function TopDoctorsChart({ topDoctors, loading }: TopDoctorsChartProps) {
  const data = topDoctors.map((d) => ({
    name: d.doctorName.replace('Dr. ', '').replace('Dra. ', ''),
    citas: d.completedAppointments,
    fullName: d.doctorName,
    specialties: d.specialties.join(', '),
  }));
  const description = `Médicos con más citas completadas: ${topDoctors.map((d) => `${d.doctorName} ${d.completedAppointments}`).join(', ')}.`;

  return (
    <ChartCard title='Médicos con más citas completadas' subheader='En el mes elegido' loading={loading} empty={data.length === 0} description={description}>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart layout='vertical' data={data} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray='3 3' horizontal={false} />
          <XAxis type='number' allowDecimals={false} axisLine={false} tickLine={false} />
          <YAxis type='category' dataKey='name' width={110} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, _name, props) => {
              const specialties = (props as { payload?: { specialties?: string } }).payload?.specialties;
              return [value as number, `Citas completadas${specialties ? ` · ${specialties}` : ''}`];
            }}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
          />
          <Bar dataKey='citas' fill='var(--mui-palette-info-main)' radius={[0, 4, 4, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
