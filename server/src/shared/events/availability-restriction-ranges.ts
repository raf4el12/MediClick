import type { AvailabilityRestrictionRange } from './availability-events.interface.js';
import { scheduleDateToLocalDay } from '../utils/date-time.utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const shiftDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

/**
 * Días del rango anterior que el rango actual ya no cubre, en días de agenda
 * (medianoche UTC). Sin rango actual (borrado o desactivado) es todo el rango
 * anterior; si el actual lo cubre por completo, no hay nada liberado.
 */
export function liftedDayRanges(
  previous: AvailabilityRestrictionRange,
  current: AvailabilityRestrictionRange | null,
): AvailabilityRestrictionRange[] {
  const prevStart = scheduleDateToLocalDay(previous.startDate);
  const prevEnd = scheduleDateToLocalDay(previous.endDate);
  if (!current) return [{ startDate: prevStart, endDate: prevEnd }];

  const curStart = scheduleDateToLocalDay(current.startDate);
  const curEnd = scheduleDateToLocalDay(current.endDate);
  if (curEnd < prevStart || curStart > prevEnd) {
    return [{ startDate: prevStart, endDate: prevEnd }];
  }

  const lifted: AvailabilityRestrictionRange[] = [];
  if (curStart > prevStart) {
    lifted.push({ startDate: prevStart, endDate: shiftDays(curStart, -1) });
  }
  if (curEnd < prevEnd) {
    lifted.push({ startDate: shiftDays(curEnd, 1), endDate: prevEnd });
  }
  return lifted;
}
