import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { GetTimeSlotsQueryDto } from '../dto/get-time-slots-query.dto.js';
import { TimeSlotResponseDto } from '../dto/time-slot-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import { TimeSlotCalculatorService } from '../../domain/services/time-slot-calculator.service.js';

/**
 * Convierte una cadena HH:mm al objeto Date de referencia (base 1970-01-01).
 * Mantiene la misma convención que el resto del proyecto.
 */
function parseHHmm(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

/**
 * Formatea un objeto Date como cadena HH:mm (extrae horas y minutos locales).
 */
function formatHHmm(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Use Case: Obtener time slots disponibles para un doctor en una fecha.
 *
 * Lógica:
 *  1. Delega al servicio de dominio puro (TimeSlotCalculatorService) la
 *     fragmentación del rango timeFrom–timeTo en intervalos de durationMinutes.
 *  2. Consulta la base de datos para obtener los horarios reales del doctor
 *     ese día, junto con el estado de ocupación de cada uno.
 *  3. Cruza los slots teóricos con los horarios del DB para marcar cuáles
 *     ya tienen una cita activa (available: false).
 */
@Injectable()
export class GetAvailableTimeSlotsUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
  ) {}

  async execute(dto: GetTimeSlotsQueryDto): Promise<TimeSlotResponseDto[]> {
    // 1. Parsear y validar el rango de tiempo
    const timeFrom = parseHHmm(dto.timeFrom);
    const timeTo = parseHHmm(dto.timeTo);

    if (timeFrom.getTime() >= timeTo.getTime()) {
      throw new BadRequestException(
        'timeFrom debe ser anterior a timeTo',
      );
    }

    // 2. Generar slots teóricos usando el servicio de dominio puro
    const theoreticalSlots = TimeSlotCalculatorService.generate(
      timeFrom,
      timeTo,
      dto.durationMinutes,
    );

    if (theoreticalSlots.length === 0) {
      return [];
    }

    // 3. Consultar horarios reales del doctor en esa fecha (con estado de cita)
    const date = new Date(dto.date);
    const existingSchedules = await this.scheduleRepository.findByDoctorAndDate(
      dto.doctorId,
      date,
      dto.specialtyId,
    );

    // 4. Construir set de claves "HH:mm_HH:mm" de los slots ya ocupados
    const occupiedKeys = new Set<string>(
      existingSchedules
        .filter((s) => s.hasActiveAppointment)
        .map((s) => `${formatHHmm(s.timeFrom)}_${formatHHmm(s.timeTo)}`),
    );

    // 5. Cruzar slots teóricos con los datos del DB
    return theoreticalSlots.map((slot) => {
      const key = `${formatHHmm(slot.startTime)}_${formatHHmm(slot.endTime)}`;
      return {
        startTime: formatHHmm(slot.startTime),
        endTime: formatHHmm(slot.endTime),
        available: !occupiedKeys.has(key),
      };
    });
  }
}
