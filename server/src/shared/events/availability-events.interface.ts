/**
 * Eventos de cambios de disponibilidad que pueden invalidar citas ya reservadas.
 *
 * Los emiten los módulos `schedule-blocks` y `holidays`; los consume un listener
 * del módulo `appointments` que cancela las citas afectadas y reofrece el slot a
 * la lista de espera (vía `appointment.slot_released`). Se usan eventos para
 * evitar que los productores dependan del núcleo de citas.
 */

export const AVAILABILITY_RESTRICTION_CHANGED_EVENT =
  'availability.restriction_changed';

export interface AvailabilityRestrictionRange {
  startDate: Date;
  endDate: Date;
}

export interface AvailabilityRestrictionChangedEvent {
  restrictionType: 'HOLIDAY' | 'SCHEDULE_BLOCK';
  restrictionId: number;
  /** null = feriado global (afecta todas las sedes). */
  clinicId: number | null;
  /** null cuando la restricción afecta a una sede y no a un médico concreto. */
  doctorId: number | null;
  previousRange: AvailabilityRestrictionRange | null;
  currentRange: AvailabilityRestrictionRange | null;
  occurredAt: Date;
  actorId: number;
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

/**
 * Una restricción dejó de aplicar sobre uno o más días: se borró, se desactivó
 * o su rango se achicó o movió. Lo consume la lista de espera para reofrecer
 * los cupos que quedaron libres. `liftedRanges` son días de agenda; el
 * consumidor recalcula qué cupos están libres de verdad.
 */
export const AVAILABILITY_RESTRICTION_LIFTED_EVENT =
  'availability.restriction_lifted';

export interface AvailabilityRestrictionLiftedEvent {
  restrictionType: 'HOLIDAY' | 'SCHEDULE_BLOCK';
  restrictionId: number;
  /** null = feriado global (afecta todas las sedes). */
  clinicId: number | null;
  /** null cuando la restricción afecta a una sede y no a un médico concreto. */
  doctorId: number | null;
  liftedRanges: AvailabilityRestrictionRange[];
  occurredAt: Date;
  actorId: number;
}
