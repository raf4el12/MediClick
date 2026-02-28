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
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import type { DailyCount } from '../types';

const CHART_MARGIN = { top: 4, right: 8, left: -16, bottom: 0 };

interface AppointmentsTrendChartProps {
  daily: DailyCount[];
  loading: boolean;
}

export default function AppointmentsTrendChart({
  daily,
  loading,
}: AppointmentsTrendChartProps) {
  const theme = useTheme();

  const data = daily.map((d) => ({
    ...d,
    label: d.date.slice(8), // día del mes (DD)
  }));

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Citas por Día"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        subheader="Evolución diaria del mes"
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <CardContent>
        {loading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : data.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height={280}>
            <Typography color="text.secondary" variant="body2">
              Sin datos para este período
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [value as number, 'Citas']}
                labelFormatter={(label) => `Día ${label}`}
              />
              <Bar
                dataKey="count"
                fill={theme.palette.primary.main}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
