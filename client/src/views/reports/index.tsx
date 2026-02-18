'use client';

import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import { useReports } from './hooks/useReports';
import KpiCards from './components/KpiCards';
import AppointmentsTrendChart from './components/AppointmentsTrendChart';
import AppointmentsByStatusChart from './components/AppointmentsByStatusChart';
import RevenueComparisonChart from './components/RevenueComparisonChart';
import TopDoctorsChart from './components/TopDoctorsChart';
import ScheduleOccupancyChart from './components/ScheduleOccupancyChart';

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function ReportsView() {
  const {
    filters,
    setFilters,
    revenue,
    topDoctors,
    summary,
    occupancy,
    loadingRevenue,
    loadingTopDoctors,
    loadingSummary,
    loadingOccupancy,
  } = useReports();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Encabezado y filtros */}
      <Box
        display="flex"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Reportes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Análisis y estadísticas del sistema
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <TextField
            select
            size="small"
            label="Mes"
            value={filters.month}
            onChange={(e) =>
              setFilters((f) => ({ ...f, month: Number(e.target.value) }))
            }
            sx={{ minWidth: 130 }}
          >
            {MONTHS.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Año"
            value={filters.year}
            onChange={(e) =>
              setFilters((f) => ({ ...f, year: Number(e.target.value) }))
            }
            sx={{ minWidth: 100 }}
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* KPIs */}
        <Grid size={12}>
          <KpiCards
            summary={summary}
            revenue={revenue}
            topDoctors={topDoctors}
            occupancy={occupancy}
            loadingSummary={loadingSummary}
            loadingRevenue={loadingRevenue}
            loadingTopDoctors={loadingTopDoctors}
            loadingOccupancy={loadingOccupancy}
          />
        </Grid>

        {/* Tendencia diaria + Comparación de ingresos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <AppointmentsTrendChart
            daily={summary?.daily ?? []}
            loading={loadingSummary}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RevenueComparisonChart revenue={revenue} loading={loadingRevenue} />
        </Grid>

        {/* Top doctores + Ocupación */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TopDoctorsChart topDoctors={topDoctors} loading={loadingTopDoctors} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ScheduleOccupancyChart occupancy={occupancy} loading={loadingOccupancy} />
        </Grid>

        {/* Citas por estado — ancho completo en mobile, media pantalla en desktop */}
        <Grid size={{ xs: 12, md: 6 }}>
          <AppointmentsByStatusChart
            byStatus={summary?.byStatus ?? {}}
            loading={loadingSummary}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
