/**
 * Representa un intervalo de tiempo calculado (time slot).
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

/**
 * Servicio de dominio puro para la fragmentación de rangos de tiempo en slots.
 *
 * No tiene dependencias externas ni acceso a base de datos.
 * Aplica el principio de separación de responsabilidades: solo calcula.
 */
export class TimeSlotCalculatorService {
  /**
   * Fragmenta un rango horario en intervalos iguales de `durationMinutes` minutos.
   *
   * @param timeFrom     Hora de inicio del turno (ej. 1970-01-01T08:00:00)
   * @param timeTo       Hora de fin del turno   (ej. 1970-01-01T14:00:00)
   * @param durationMinutes Duración de cada cita en minutos (ej. 20)
   * @param bufferMinutes   Minutos de descanso entre citas consecutivas (ej. 5)
   * @returns Array de slots ordenados cronológicamente. El último slot que
   *          no cabe completo dentro del rango es descartado.
   *
   * @example
   * // 08:00 – 14:00 con 20 min y 5 min buffer → slots de 25 min de separación
   * TimeSlotCalculatorService.generate(timeFrom, timeTo, 20, 5);
   */
  static generate(
    timeFrom: Date,
    timeTo: Date,
    durationMinutes: number,
    bufferMinutes: number = 0,
  ): TimeSlot[] {
    if (durationMinutes <= 0) {
      throw new Error('La duración de la cita debe ser mayor a 0 minutos');
    }

    if (timeFrom.getTime() >= timeTo.getTime()) {
      throw new Error('horaInicioTurno debe ser anterior a horaFinTurno');
    }

    const slots: TimeSlot[] = [];
    const durationMs = durationMinutes * 60 * 1000;
    const bufferMs = bufferMinutes * 60 * 1000;
    let current = timeFrom.getTime();
    const end = timeTo.getTime();

    while (current + durationMs <= end) {
      slots.push({
        startTime: new Date(current),
        endTime: new Date(current + durationMs),
      });
      // Avanzar por duración + buffer (el buffer es el descanso entre slots)
      current += durationMs + bufferMs;
    }

    return slots;
  }
}
