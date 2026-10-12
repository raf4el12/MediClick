'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPrice } from '@/views/booking/format';
import type { RevenueReport } from '../types';
import ChartCard from './ChartCard';

interface RevenueComparisonChartProps {
  revenue: RevenueReport | null;
  loading: boolean;
}

export default function RevenueComparisonChart({ revenue, loading }: RevenueComparisonChartProps) {
  const collectionRate = revenue && revenue.projectedRevenue > 0 ? Math.round((revenue.actualRevenue / revenue.projectedRevenue) * 1000) / 10 : 0;
  const data = revenue ? [{ name: 'Ingresos', Proyectado: revenue.projectedRevenue, Real: revenue.actualRevenue }] : [];
  const money = (value: number) => (revenue ? formatPrice(value, revenue.currency) : String(value));
  const description = revenue
    ? `Ingresos del mes: ${money(revenue.actualRevenue)} cobrados de ${money(revenue.projectedRevenue)} proyectados, una tasa de cobro de ${collectionRate} %.`
    : 'Ingresos del mes sin datos.';

  return (
    <ChartCard
      title='Ingresos del mes'
      subheader={revenue ? `Proyectado frente a cobrado · tasa de cobro ${collectionRate} %` : 'Proyectado frente a cobrado'}
      loading={loading}
      empty={!revenue}
      description={description}
    >
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barCategoryGap='30%'>
          <CartesianGrid strokeDasharray='3 3' vertical={false} />
          <XAxis dataKey='name' axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(v: number) => money(v)} width={90} />
          <Tooltip formatter={(value, name) => [money(value as number), name as string]} />
          <Legend iconType='circle' iconSize={8} />
          <Bar dataKey='Proyectado' fill='var(--mui-palette-primary-lightOpacity)' stroke='var(--mui-palette-primary-main)' radius={[4, 4, 0, 0]} maxBarSize={60} />
          <Bar dataKey='Real' name='Cobrado' fill='var(--mui-palette-success-main)' radius={[4, 4, 0, 0]} maxBarSize={60} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
