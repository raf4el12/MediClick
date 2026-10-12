'use client';

import HorizontalWithSubtitle from '@/components/card-statistics/HorizontalWithSubtitle';
import { formatPrice } from '@/views/booking/format';
import type { AppointmentsSummary, RevenueReport, ScheduleOccupancy, TopDoctor } from '../types';

interface KpiCardsProps {
  summary: AppointmentsSummary | null;
  revenue: RevenueReport | null;
  topDoctors: TopDoctor[];
  occupancy: ScheduleOccupancy | null;
  loadingSummary: boolean;
  loadingRevenue: boolean;
  loadingTopDoctors: boolean;
  loadingOccupancy: boolean;
}

/** Indicadores del mes (`card-statistics` de Materio) con los mismos datos que los gráficos. */
export default function KpiCards({ summary, revenue, topDoctors, occupancy, loadingSummary, loadingRevenue, loadingTopDoctors, loadingOccupancy }: KpiCardsProps) {
  const topDoctor = topDoctors[0];

  return (
    <section aria-label='Indicadores del mes' className='grid gap-6 sm:grid-cols-2 xl:grid-cols-4'>
      <HorizontalWithSubtitle
        title='Citas del mes'
        stats={summary ? String(summary.total) : '—'}
        subtitle='En el período elegido'
        avatarIcon='ri-calendar-check-line'
        avatarColor='primary'
        loading={loadingSummary}
      />
      <HorizontalWithSubtitle
        title='Ingresos cobrados'
        stats={revenue ? formatPrice(revenue.actualRevenue, revenue.currency) : '—'}
        subtitle={revenue ? `Proyectado: ${formatPrice(revenue.projectedRevenue, revenue.currency)}` : 'Sin datos de ingresos'}
        avatarIcon='ri-money-dollar-circle-line'
        avatarColor='success'
        loading={loadingRevenue}
      />
      <HorizontalWithSubtitle
        title='Médico con más citas'
        stats={topDoctor ? topDoctor.doctorName : '—'}
        subtitle={topDoctor ? `${topDoctor.completedAppointments} citas completadas` : 'Sin citas completadas'}
        avatarIcon='ri-stethoscope-line'
        avatarColor='info'
        loading={loadingTopDoctors}
      />
      <HorizontalWithSubtitle
        title='Ocupación de cupos'
        stats={occupancy ? `${occupancy.occupancyRate} %` : '—'}
        subtitle={occupancy ? `${occupancy.bookedSlots} de ${occupancy.totalSlots} cupos` : 'Sin datos de cupos'}
        avatarIcon='ri-pie-chart-line'
        avatarColor='warning'
        loading={loadingOccupancy}
      />
    </section>
  );
}
