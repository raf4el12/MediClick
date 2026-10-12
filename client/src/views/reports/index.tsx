'use client';

import dynamic from 'next/dynamic';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useReports } from './hooks/useReports';
import KpiCards from './components/KpiCards';

const AppointmentsTrendChart = dynamic(() => import('./components/AppointmentsTrendChart'), { ssr: false });
const AppointmentsByStatusChart = dynamic(() => import('./components/AppointmentsByStatusChart'), { ssr: false });
const RevenueComparisonChart = dynamic(() => import('./components/RevenueComparisonChart'), { ssr: false });
const TopDoctorsChart = dynamic(() => import('./components/TopDoctorsChart'), { ssr: false });
const ScheduleOccupancyChart = dynamic(() => import('./components/ScheduleOccupancyChart'), { ssr: false });

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function ReportsView() {
  const { filters, setFilters, revenue, topDoctors, summary, occupancy, loadingRevenue, loadingTopDoctors, loadingSummary, loadingOccupancy } = useReports();

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <Typography variant='h4' component='h1'>
            Reportes
          </Typography>
          <Typography color='text.secondary'>Citas, ingresos y ocupación de cupos del mes elegido.</Typography>
        </div>
        <div className='flex flex-wrap gap-3'>
          <TextField
            select
            id='reportes-mes'
            size='small'
            label='Mes'
            value={filters.month}
            onChange={(e) => setFilters((f) => ({ ...f, month: Number(e.target.value) }))}
            className='is-36'
          >
            {MONTHS.map((label, i) => (
              <MenuItem key={label} value={i + 1}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            id='reportes-anio'
            size='small'
            label='Año'
            value={filters.year}
            onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
            className='is-28'
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </div>

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

      <div className='grid gap-6 lg:grid-cols-2'>
        <AppointmentsTrendChart daily={summary?.daily ?? []} loading={loadingSummary} />
        <RevenueComparisonChart revenue={revenue} loading={loadingRevenue} />
        <TopDoctorsChart topDoctors={topDoctors} loading={loadingTopDoctors} />
        <ScheduleOccupancyChart occupancy={occupancy} loading={loadingOccupancy} />
        <div className='lg:col-span-2 lg:max-is-[560px] lg:mli-auto is-full'>
          <AppointmentsByStatusChart byStatus={summary?.byStatus ?? {}} loading={loadingSummary} />
        </div>
      </div>
    </div>
  );
}
