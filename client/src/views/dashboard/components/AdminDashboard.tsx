'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import HorizontalWithSubtitle from '@/components/card-statistics/HorizontalWithSubtitle';
import CustomAvatar from '@core/components/mui/Avatar';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { statusColor, toDashboardKpis } from '../functions/dashboardKpis';
import { useDashboard } from '../hooks/useDashboard';

const AppointmentsByStatusChart = dynamic(() => import('@/views/reports/components/AppointmentsByStatusChart'), { ssr: false });
const AppointmentsTrendChart = dynamic(() => import('@/views/reports/components/AppointmentsTrendChart'), { ssr: false });

const QUICK_ACTIONS = [
  { label: 'Citas', description: 'Agendar y gestionar citas', icon: 'ri-calendar-todo-line', href: '/appointments' },
  { label: 'Pacientes', description: 'Registrar y editar pacientes', icon: 'ri-user-heart-line', href: '/patients' },
  { label: 'Disponibilidad', description: 'Reglas, bloqueos y cupos', icon: 'ri-calendar-event-line', href: '/availability' },
  { label: 'Reportes', description: 'Estadísticas del mes', icon: 'ri-bar-chart-box-line', href: '/reports' },
];

/** Dashboard de administración (tarjetas `card-statistics` y widgets de Materio en recharts). */
export const AdminDashboard = () => {
  const user = useAppSelector(selectUser);
  const { stats, summary, occupancy, revenue, loading } = useDashboard();
  const kpis = toDashboardKpis(summary, occupancy, revenue);
  const [today] = useState(() =>
    new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: user?.clinicTimezone ?? undefined }).format(new Date()),
  );

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Hola, {user?.name ?? 'equipo'}
        </Typography>
        <Typography color='text.secondary' className='first-letter:uppercase'>
          {today}
          {user?.clinicName ? ` · ${user.clinicName}` : ''}
        </Typography>
      </div>

      <section aria-label='Resumen de la sede' className='grid gap-6 sm:grid-cols-2 xl:grid-cols-4'>
        <HorizontalWithSubtitle title='Citas de hoy' stats={String(stats.todayAppointments)} subtitle='Programadas para hoy' avatarIcon='ri-calendar-check-line' avatarColor='primary' loading={loading} />
        <HorizontalWithSubtitle title='Pacientes' stats={String(stats.totalPatients)} subtitle='Registrados' avatarIcon='ri-user-heart-line' avatarColor='success' loading={loading} />
        <HorizontalWithSubtitle title='Médicos' stats={String(stats.totalDoctors)} subtitle='Registrados en la sede' avatarIcon='ri-stethoscope-line' avatarColor='info' loading={loading} />
        <HorizontalWithSubtitle title='Especialidades' stats={String(stats.totalSpecialties)} subtitle='Áreas médicas' avatarIcon='ri-heart-pulse-line' avatarColor='warning' loading={loading} />
      </section>

      <div className='grid gap-6 lg:grid-cols-3'>
        <Card>
          <CardHeader title='Citas del mes' subheader={loading ? 'Cargando…' : `${kpis.monthTotal} en total`} />
          <CardContent>
            {loading ? (
              <Skeleton variant='rounded' height={160} />
            ) : (
              <ul aria-label='Conteo por estado' className='flex flex-col gap-2 m-0 p-0 list-none'>
                {kpis.statuses.map((s) => (
                  <li key={s.status} className='flex items-center justify-between gap-3'>
                    <span className='flex items-center gap-2'>
                      <span aria-hidden className='inline-block is-2.5 bs-2.5 rounded-full' style={{ backgroundColor: `var(--mui-palette-${statusColor(s.status)}-main)` }} />
                      <Typography color='text.primary'>{s.label}</Typography>
                    </span>
                    <Typography color='text.primary' className='font-medium tabular-nums'>
                      {s.count}
                    </Typography>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title='Ocupación de cupos' subheader='Cupos reservados del mes' />
          <CardContent className='flex flex-col gap-3'>
            {loading ? (
              <Skeleton variant='rounded' height={96} />
            ) : (
              <>
                <Typography variant='h3'>{kpis.occupancy.percent} %</Typography>
                <LinearProgress variant='determinate' value={kpis.occupancy.progress} aria-label='Ocupación de cupos del mes' className='bs-2 rounded' />
                <Typography color='text.secondary'>
                  {kpis.occupancy.booked} de {kpis.occupancy.total} cupos
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title='Ingresos del mes' subheader='Transacciones de pago aprobadas' />
          <CardContent className='flex flex-col gap-2'>
            {loading ? (
              <Skeleton variant='rounded' height={96} />
            ) : kpis.revenue ? (
              <>
                <Typography variant='h3' className='tabular-nums'>
                  {kpis.revenue.actual}
                </Typography>
                <Typography color='text.secondary'>Proyectado: {kpis.revenue.projected}</Typography>
              </>
            ) : (
              <Typography color='text.secondary'>Sin datos de ingresos del mes.</Typography>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <AppointmentsByStatusChart byStatus={summary?.byStatus ?? {}} loading={loading} title='Citas del mes por estado' />
        <AppointmentsTrendChart daily={summary?.daily ?? []} loading={loading} title='Citas por día del mes' />
      </div>

      <Card>
        <CardHeader title='Accesos rápidos' />
        <CardContent>
          <ul className='grid gap-4 m-0 p-0 list-none sm:grid-cols-2 xl:grid-cols-4'>
            {QUICK_ACTIONS.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className='flex items-center gap-3 p-3 rounded no-underline'
                  style={{ border: '1px solid var(--mui-palette-divider)', color: 'inherit' }}
                >
                  <CustomAvatar skin='light' color='primary' variant='rounded' size={38}>
                    <i className={`${action.icon} text-[22px]`} aria-hidden />
                  </CustomAvatar>
                  <span className='flex flex-col'>
                    <Typography color='text.primary' className='font-medium'>
                      {action.label}
                    </Typography>
                    <Typography variant='body2'>{action.description}</Typography>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
