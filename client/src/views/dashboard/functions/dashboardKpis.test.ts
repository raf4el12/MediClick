import { describe, expect, it } from 'vitest';
import { toDashboardKpis } from './dashboardKpis';

const summary = { total: 12, byStatus: { COMPLETED: 5, NO_SHOW: 1, CANCELLED: 2 }, daily: [] };

describe('toDashboardKpis', () => {
  it('sin cupos en el mes la ocupación es cero, sin dividir por cero', () => {
    const { occupancy } = toDashboardKpis(summary, { totalSlots: 0, bookedSlots: 0, availableSlots: 0, occupancyRate: 0 }, null);

    expect(occupancy).toEqual({ percent: 0, progress: 0, booked: 0, total: 0 });
  });

  it('la ocupación redondea el porcentaje del servidor como hoy y el progreso usa los cupos', () => {
    const { occupancy } = toDashboardKpis(summary, { totalSlots: 8, bookedSlots: 3, availableSlots: 5, occupancyRate: 37.5 }, null);

    expect(occupancy).toEqual({ percent: 38, progress: 37.5, booked: 3, total: 8 });
  });

  it('los ingresos se muestran con la moneda que informa el reporte', () => {
    const pen = toDashboardKpis(summary, null, { actualRevenue: 1250, projectedRevenue: 2000, currency: 'PEN' }).revenue!;
    const cop = toDashboardKpis(summary, null, { actualRevenue: 1250, projectedRevenue: 2000, currency: 'COP' }).revenue!;

    expect(pen.actual).toMatch(/^S\/\s1,250\.00$/);
    expect(pen.projected).toMatch(/^S\/\s2,000\.00$/);
    expect(cop.actual).not.toContain('S/');
    expect(cop.actual).toContain('1.250');
  });

  it('las citas del mes van por estado, en orden fijo y con las etiquetas del glosario', () => {
    const { monthTotal, statuses } = toDashboardKpis(summary, null, null);

    expect(monthTotal).toBe(12);
    expect(statuses).toEqual([
      { status: 'PENDING', label: 'Pendiente', count: 0 },
      { status: 'CONFIRMED', label: 'Confirmada', count: 0 },
      { status: 'IN_PROGRESS', label: 'En curso', count: 0 },
      { status: 'COMPLETED', label: 'Completada', count: 5 },
      { status: 'CANCELLED', label: 'Cancelada', count: 2 },
      { status: 'NO_SHOW', label: 'Inasistencia', count: 1 },
    ]);
  });

  it('sin resumen del mes los conteos quedan en cero', () => {
    const { monthTotal, statuses } = toDashboardKpis(null, null, null);

    expect(monthTotal).toBe(0);
    expect(statuses.every((s) => s.count === 0)).toBe(true);
  });

  it('sin reporte de ingresos no hay tarjeta de ingresos', () => {
    expect(toDashboardKpis(summary, null, null).revenue).toBeNull();
  });
});
