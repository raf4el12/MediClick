/**
 * Eventos de cambios de disponibilidad que pueden invalidar citas ya reservadas.
 *
 * Los emiten los módulos `schedule-blocks` y `holidays`; los consume un listener
 * del módulo `appointments` que cancela las citas afectadas y reofrece el slot a
 * la lista de espera (vía `appointment.slot_released`). Se usan eventos para
 * evitar un ciclo de módulos: `appointments` ya importa `schedule-blocks`/`holidays`.
 */

export const SCHEDULE_BLOCKED_EVENT = 'schedule.blocked';
export const HOLIDAY_CREATED_EVENT = 'holiday.created';

export interface ScheduleBlockedEvent {
  doctorId: number;
  startDate: Date;
  endDate: Date;
  /** FULL_DAY cancela todo el día; TIME_RANGE solo el rango horario. */
  type: 'FULL_DAY' | 'TIME_RANGE';
  /** Hora-only; presentes solo cuando type === 'TIME_RANGE'. */
  timeFrom?: Date | null;
  timeTo?: Date | null;
  reason?: string | null;
}

export interface HolidayCreatedEvent {
  date: Date;
  /** null = feriado global (afecta todas las sedes). */
  clinicId: number | null;
  name: string;
}

/**
 * Un slot quedó libre (cancelación, reagendamiento o expiración de pago).
 * Lo consume la lista de espera para reofrecerlo. Se emite SIEMPRE, a
 * diferencia de `appointment.cancelled` (mail/notificación) que requiere que
 * el paciente tenga usuario asociado.
 */
export const SLOT_RELEASED_EVENT = 'appointment.slot_released';

export interface SlotReleasedEvent {
  appointmentId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  clinicId: number | null;
}
