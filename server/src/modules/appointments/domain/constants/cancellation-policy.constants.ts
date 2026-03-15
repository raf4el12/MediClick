/**
 * Políticas de cancelación de citas.
 *
 * Define las reglas de tiempo mínimo para cancelar sin penalización
 * y el porcentaje de penalización cuando se cancela fuera de plazo.
 */

/** Horas mínimas de anticipación para que un PACIENTE cancele sin penalización */
export const MIN_CANCELLATION_HOURS_PATIENT = 24;

/** Porcentaje del monto de la cita que se cobra como penalización (0-100) */
export const CANCELLATION_FEE_PERCENTAGE = 50;
