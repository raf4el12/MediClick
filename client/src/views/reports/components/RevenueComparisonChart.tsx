'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import type { RevenueReport } from '../types';

interface RevenueComparisonChartProps {
  revenue: RevenueReport | null;
  loading: boolean;
}

export default function RevenueComparisonChart({
  revenue,
  loading,
}: RevenueComparisonChartProps) {
  const theme = useTheme();

  const collectionRate =
    revenue && revenue.projectedRevenue > 0
      ? Math.round((revenue.actualRevenue / revenue.projectedRevenue) * 1000) / 10
      : 0;

  const data = revenue
    ? [
        {
          name: 'Ingresos',
          Proyectado: revenue.projectedRevenue,
          Real: revenue.actualRevenue,
        },
      ]
    : [];

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Ingresos: Proyectado vs Real"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        subheader={
          revenue
            ? `Tasa de cobro: ${collectionRate}%`
            : 'Comparativa del período'
        }
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <CardContent>
        {loading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : !revenue ? (
          <Box display="flex" alignItems="center" justifyContent="center" height={280}>
            <Typography color="text.secondary" variant="body2">
              Sin datos para este período
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `S/${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                  name,
                ]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Proyectado" fill={theme.palette.primary.light} radius={[4, 4, 0, 0]} maxBarSize={60} />
              <Bar dataKey="Real" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
