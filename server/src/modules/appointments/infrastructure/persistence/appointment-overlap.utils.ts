import { Prisma } from '@prisma/client';
import { utcDayRange } from '../../../../shared/utils/date-time.utils.js';

/**
 * Predicados Prisma de solapamiento de citas, compartidos entre el
 * repositorio de appointments y cualquier otro flujo que necesite revalidar
 * disponibilidad dentro de su propia transacción (p. ej. la aceptación
 * atómica de ofertas de lista de espera — SDD-013).
 *
 * Viven fuera de la clase del repositorio para evitar que dos módulos deban
 * acoplarse al repositorio completo de appointments solo para reutilizar el
 * criterio de "qué cuenta como solapado"; ambos importan estas funciones
 * puras y las aplican dentro de su propio `tx` de Prisma.
 */

/**
 * Overlap a nivel de DOCTOR + FECHA (no de scheduleId). startTime/endTime se
 * almacenan como hora-only (base 1970-01-01), por lo que el overlap de horas
 * solo es válido si se acota al mismo doctor y al mismo día.
 */
export function buildDoctorOverlapWhere(
  doctorId: number,
  scheduleDate: Date,
  startTime: Date,
  endTime: Date,
  excludeId?: number,
): Prisma.AppointmentsWhereInput {
  const { start, end } = utcDayRange(scheduleDate);
  return {
    deleted: false,
    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    // Overlap: A.start < B.end AND A.end > B.start
    startTime: { lt: endTime },
    endTime: { gt: startTime },
    schedule: {
      doctorId,
      scheduleDate: { gte: start, lt: end },
    },
    ...(excludeId && { id: { not: excludeId } }),
  };
}

/**
 * Overlap de agenda del PACIENTE: citas activas del mismo paciente en la
 * misma fecha que se superpongan en horario (con cualquier doctor).
 */
export function buildPatientOverlapWhere(
  patientId: number,
  scheduleDate: Date,
  startTime: Date,
  endTime: Date,
  excludeId?: number,
): Prisma.AppointmentsWhereInput {
  const { start, end } = utcDayRange(scheduleDate);
  return {
    deleted: false,
    patientId,
    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    startTime: { lt: endTime },
    endTime: { gt: startTime },
    schedule: { scheduleDate: { gte: start, lt: end } },
    ...(excludeId && { id: { not: excludeId } }),
  };
}
