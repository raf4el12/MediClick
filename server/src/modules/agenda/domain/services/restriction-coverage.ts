/** Cita en días y horas locales de la sede (`YYYY-MM-DD` y `HH:mm`). */
export interface CoverageAppointment {
  date: string;
  startTime: string;
  endTime: string;
  clinicId: number | null;
}

export interface CoverageBlock {
  type: 'FULL_DAY' | 'TIME_RANGE';
  startDate: string;
  endDate: string;
  timeFrom: string | null;
  timeTo: string | null;
}

export interface CoverageHoliday {
  date: string;
  /** null = feriado global. */
  clinicId: number | null;
}

/** Misma regla que `isHoliday`: misma fecha local y feriado global o de la sede de la cita. */
export function holidayCovers(
  holiday: CoverageHoliday,
  appointment: CoverageAppointment,
): boolean {
  return (
    holiday.date === appointment.date &&
    (holiday.clinicId === null || holiday.clinicId === appointment.clinicId)
  );
}

/** Misma regla que `isBlocked`: día completo dentro del rango, o franja que se solapa con la cita. */
export function blockCovers(
  block: CoverageBlock,
  appointment: CoverageAppointment,
): boolean {
  if (appointment.date < block.startDate || appointment.date > block.endDate) {
    return false;
  }
  if (block.type === 'FULL_DAY') return true;
  return (
    block.timeFrom !== null &&
    block.timeTo !== null &&
    block.timeFrom < appointment.endTime &&
    block.timeTo > appointment.startTime
  );
}
