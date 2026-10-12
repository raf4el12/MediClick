import type { AppointmentStatus } from '@/views/appointments/types';
import { ALL_STATUSES, STATUS_META, type StatusColor } from '@/views/agenda/status';
import { formatPrice } from '@/views/booking/format';
import type { AppointmentsSummary, RevenueReport, ScheduleOccupancy } from '@/views/reports/types';

export interface DashboardStatusCount {
  status: AppointmentStatus;
  label: string;
  count: number;
}

export interface DashboardKpis {
  monthTotal: number;
  /** Los seis estados en orden fijo, con las etiquetas del glosario. */
  statuses: DashboardStatusCount[];
  occupancy: { percent: number; progress: number; booked: number; total: number };
  /** Ingresos del mes con la moneda del reporte, o `null` si el reporte no está. */
  revenue: { actual: string; projected: string } | null;
}

export const statusColor = (status: AppointmentStatus): StatusColor => STATUS_META[status].color;

/** Tarjetas del dashboard de administración a partir de los reportes del mes. */
export function toDashboardKpis(
  summary: AppointmentsSummary | null,
  occupancy: ScheduleOccupancy | null,
  revenue: RevenueReport | null,
): DashboardKpis {
  const booked = occupancy?.bookedSlots ?? 0;
  const total = occupancy?.totalSlots ?? 0;

  return {
    monthTotal: summary?.total ?? 0,
    statuses: ALL_STATUSES.map((status) => ({ status, label: STATUS_META[status].label, count: summary?.byStatus[status] ?? 0 })),
    occupancy: {
      percent: Math.round(occupancy?.occupancyRate ?? 0),
      progress: total > 0 ? (booked / total) * 100 : 0,
      booked,
      total,
    },
    revenue: revenue
      ? {
          actual: formatPrice(revenue.actualRevenue, revenue.currency),
          projected: formatPrice(revenue.projectedRevenue, revenue.currency),
        }
      : null,
  };
}
