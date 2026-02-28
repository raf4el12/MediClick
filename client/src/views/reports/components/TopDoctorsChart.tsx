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
import type { TopDoctor } from '../types';

const CHART_MARGIN = { top: 4, right: 24, left: 8, bottom: 0 };

interface TopDoctorsChartProps {
  topDoctors: TopDoctor[];
  loading: boolean;
}

export default function TopDoctorsChart({
  topDoctors,
  loading,
}: TopDoctorsChartProps) {
  const theme = useTheme();

  const data = topDoctors.map((d) => ({
    name: d.doctorName.replace('Dr. ', '').replace('Dra. ', ''),
    citas: d.completedAppointments,
    fullName: d.doctorName,
    specialties: d.specialties.join(', '),
  }));

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Top Doctores"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        subheader="Por citas completadas en el período"
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
            <BarChart
              layout="vertical"
              data={data}
              margin={CHART_MARGIN}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
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
                formatter={(value, _name, props) => [
                  value as number,
                  `Citas${(props as { payload?: { specialties?: string } }).payload?.specialties ? ` · ${(props as { payload?: { specialties?: string } }).payload?.specialties}` : ''}`,
                ]}
                labelFormatter={(_label, payload) =>
                  payload?.[0]?.payload?.fullName ?? _label
                }
              />
              <Bar
                dataKey="citas"
                fill={theme.palette.info.main}
                radius={[0, 4, 4, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
