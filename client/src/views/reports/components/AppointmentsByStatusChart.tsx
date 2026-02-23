'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@mui/material/styles';

interface AppointmentsByStatusChartProps {
  byStatus: Record<string, number>;
  loading: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No Asistió',
};

export default function AppointmentsByStatusChart({
  byStatus,
  loading,
}: AppointmentsByStatusChartProps) {
  const theme = useTheme();

  const COLORS = [
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.grey[500],
  ];

  const data = Object.entries(byStatus)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] ?? key,
      value,
    }));

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Citas por Estado"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        subheader="Distribución por status"
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
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => [value, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
