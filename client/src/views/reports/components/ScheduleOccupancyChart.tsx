'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import type { ScheduleOccupancy } from '../types';

interface ScheduleOccupancyChartProps {
  occupancy: ScheduleOccupancy | null;
  loading: boolean;
}

export default function ScheduleOccupancyChart({
  occupancy,
  loading,
}: ScheduleOccupancyChartProps) {
  const theme = useTheme();

  const rate = occupancy?.occupancyRate ?? 0;
  const data = [
    { name: 'Ocupación', value: rate, fill: theme.palette.warning.main },
  ];

  const colorByRate =
    rate >= 80
      ? theme.palette.success.main
      : rate >= 50
        ? theme.palette.warning.main
        : theme.palette.error.main;

  const dataColored = [{ ...data[0], fill: colorByRate }];

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Ocupación de Horarios"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        subheader="Porcentaje del mes"
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <CardContent>
        {loading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : !occupancy ? (
          <Box display="flex" alignItems="center" justifyContent="center" height={280}>
            <Typography color="text.secondary" variant="body2">
              Sin datos para este período
            </Typography>
          </Box>
        ) : (
          <Box position="relative">
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                startAngle={225}
                endAngle={-45}
                data={dataColored}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  background={{ fill: theme.palette.action.hover }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Valor central superpuesto */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="h4" fontWeight={700} color={colorByRate}>
                {rate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {occupancy.bookedSlots} / {occupancy.totalSlots} horarios
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
