'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ALL_STATUSES, STATUS_META } from '@/views/agenda/status';
import ChartCard from './ChartCard';

interface AppointmentsByStatusChartProps {
  byStatus: Record<string, number>;
  loading: boolean;
  title?: string;
}

/** Estados con citas, con las etiquetas y colores del glosario (los mismos de la agenda). */
export function statusSlices(byStatus: Record<string, number>) {
  return ALL_STATUSES.filter((s) => (byStatus[s] ?? 0) > 0).map((s) => ({
    name: STATUS_META[s].label,
    value: byStatus[s]!,
    color: `var(--mui-palette-${STATUS_META[s].color}-main)`,
  }));
}

export default function AppointmentsByStatusChart({ byStatus, loading, title = 'Citas por estado' }: AppointmentsByStatusChartProps) {
  const data = statusSlices(byStatus);
  const description = `${title}: ${data.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(', ')}.`;

  return (
    <ChartCard title={title} subheader='Distribución del mes' loading={loading} empty={data.length === 0} description={description}>
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie data={data} cx='50%' cy='45%' innerRadius={60} outerRadius={100} paddingAngle={3} dataKey='value' stroke='var(--mui-palette-background-paper)'>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend iconType='circle' iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
