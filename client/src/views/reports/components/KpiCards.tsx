'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import type { RevenueReport, TopDoctor, AppointmentsSummary, ScheduleOccupancy } from '../types';

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

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
  loading: boolean;
}

function KpiCard({ title, value, subtitle, icon, color, loading }: KpiCardProps) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid size="grow">
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={120} height={40} />
            ) : (
              <Typography variant="h5" fontWeight={700} mt={0.5}>
                {value}
              </Typography>
            )}
            {subtitle && !loading && (
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                {subtitle}
              </Typography>
            )}
          </Grid>
          <Grid>
            <Typography fontSize={36} color={color}>
              <i className={icon} aria-hidden="true" />
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default function KpiCards({
  summary,
  revenue,
  topDoctors,
  occupancy,
  loadingSummary,
  loadingRevenue,
  loadingTopDoctors,
  loadingOccupancy,
}: KpiCardsProps) {
  const topDoctor = topDoctors[0];

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Total Citas"
          value={summary ? summary.total.toString() : '—'}
          subtitle="en el período"
          icon="ri-calendar-check-line"
          color="primary.main"
          loading={loadingSummary}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Ingresos Reales"
          value={revenue ? `S/ ${revenue.actualRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
          subtitle={revenue ? `Proyectado: S/ ${revenue.projectedRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : undefined}
          icon="ri-money-dollar-circle-line"
          color="success.main"
          loading={loadingRevenue}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Top Doctor"
          value={topDoctor ? topDoctor.doctorName : '—'}
          subtitle={topDoctor ? `${topDoctor.completedAppointments} citas completadas` : undefined}
          icon="ri-stethoscope-line"
          color="info.main"
          loading={loadingTopDoctors}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Ocupación"
          value={occupancy ? `${occupancy.occupancyRate}%` : '—'}
          subtitle={occupancy ? `${occupancy.bookedSlots} / ${occupancy.totalSlots} horarios` : undefined}
          icon="ri-pie-chart-line"
          color="warning.main"
          loading={loadingOccupancy}
        />
      </Grid>
    </Grid>
  );
}
