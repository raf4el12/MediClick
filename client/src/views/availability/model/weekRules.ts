import { AppointmentStatus } from '@/views/appointments/types';
import type { AgendaAppointment } from '@/views/agenda/types';
import { ORDERED_DAYS, type Availability, type AvailabilityType, type DayOfWeek } from '../types';

export interface RuleSlot {
  start: string;
  end: string;
  type: AvailabilityType;
}

export interface Validity {
  startDate: string;
  endDate: string;
}

/** Reglas de un médico y una especialidad: franjas por día y una vigencia común (como las guarda `bulk-save`). */
export interface WeekRules {
  days: Record<DayOfWeek, RuleSlot[]>;
  validity: Validity;
}

const emptyDays = () => Object.fromEntries(ORDERED_DAYS.map((d) => [d, []])) as unknown as Record<DayOfWeek, RuleSlot[]>;

/** Reglas guardadas de una especialidad → semana editable. */
export function rulesToWeek(rows: Availability[], specialtyId: number): WeekRules {
  const mine = rows.filter((r) => r.specialtyId === specialtyId && r.isAvailable);
  const days = emptyDays();
  for (const r of mine) days[r.dayOfWeek].push({ start: r.timeFrom, end: r.timeTo, type: r.type });
  for (const d of ORDERED_DAYS) days[d].sort((a, b) => a.start.localeCompare(b.start));

  return {
    days,
    validity: { startDate: mine[0]?.startDate.slice(0, 10) ?? '', endDate: mine[0]?.endDate.slice(0, 10) ?? '' },
  };
}

/** Semana editable → entradas de `POST /availability/bulk-save`. */
export function weekToEntries({ days, validity }: WeekRules) {
  return ORDERED_DAYS.flatMap((dayOfWeek) =>
    days[dayOfWeek].map((slot) => ({
      startDate: validity.startDate,
      endDate: validity.endDate,
      dayOfWeek,
      timeFrom: slot.start,
      timeTo: slot.end,
      type: slot.type,
    })),
  );
}

const OPEN: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

/** Día de la semana de una fecha `YYYY-MM-DD`, sin pasar por la zona del proceso. */
const dayOf = (date: string) => ORDERED_DAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]!;

/**
 * Citas por atender, desde `today`, de la especialidad que las reglas nuevas no cubren. Guardar las
 * reglas no las cancela: conservan su cupo, pero dejan de estar dentro de la oferta.
 */
export function appointmentsOutsideRules(appointments: AgendaAppointment[], specialtyId: number, week: WeekRules, today: string) {
  const { startDate, endDate } = week.validity;
  return appointments.filter(
    (a) =>
      a.specialtyId === specialtyId &&
      OPEN.includes(a.status) &&
      a.date >= today &&
      !(a.date >= startDate && a.date <= endDate && week.days[dayOf(a.date)].some((s) => s.start <= a.startTime && a.endTime <= s.end)),
  );
}
