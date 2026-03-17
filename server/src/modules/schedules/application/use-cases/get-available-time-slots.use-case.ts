import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GetTimeSlotsQueryDto } from '../dto/get-time-slots-query.dto.js';
import { TimeSlotResponseDto } from '../dto/time-slot-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import { TimeSlotCalculatorService } from '../../domain/services/time-slot-calculator.service.js';
import type { ScheduleWithBookedSlots } from '../../domain/interfaces/schedule-data.interface.js';
import {
  dateToTimeString,
  normalizeToTimeOnly,
  timeRangesOverlap,
} from '../../../../shared/utils/date-time.utils.js';

/**
 * Use Case: Obtener time slots disponibles para un doctor en una fecha.
 *
 * Lógica auto-contenida:
 *  1. Busca los horarios (bloques generales) del doctor para la fecha y especialidad.
 *  2. Obtiene la duración de la especialidad.
 *  3. Fragmenta cada bloque en slots usando TimeSlotCalculatorService.
 *  4. Cruza con las citas existentes para marcar slots ocupados.
 */
@Injectable()
export class GetAvailableTimeSlotsUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
  ) {}

  async execute(dto: GetTimeSlotsQueryDto): Promise<TimeSlotResponseDto[]> {
    // 1. Obtener la duración de la especialidad
    const specialty = await this.specialtyRepository.findById(dto.specialtyId);
    if (!specialty) {
      throw new NotFoundException('La especialidad especificada no existe');
    }
    if (!specialty.duration || specialty.duration <= 0) {
      throw new BadRequestException(
        'La especialidad no tiene una duración configurada',
      );
    }

    // 2. Buscar los horarios del doctor para esa fecha y especialidad,
    //    junto con las citas activas ya agendadas
    const date = new Date(dto.date);
    const schedules =
      await this.scheduleRepository.findByDoctorDateWithBookedSlots(
        dto.doctorId,
        date,
        dto.specialtyId,
      );

    if (schedules.length === 0) {
      return [];
    }

    // 3. Generar slots y cruzar con citas existentes para cada bloque
    const result: TimeSlotResponseDto[] = [];
    const bufferMinutes = specialty.bufferMinutes ?? 0;

    for (const schedule of schedules) {
      const slots = this.generateSlotsForSchedule(
        schedule,
        specialty.duration,
        bufferMinutes,
      );
      result.push(...slots);
    }

    return result;
  }

  /**
   * Genera los time slots para un bloque horario y marca como ocupados
   * los que se superponen con citas existentes.
   */
  private generateSlotsForSchedule(
    schedule: ScheduleWithBookedSlots,
    durationMinutes: number,
    bufferMinutes: number,
  ): TimeSlotResponseDto[] {
    const theoreticalSlots = TimeSlotCalculatorService.generate(
      normalizeToTimeOnly(schedule.timeFrom),
      normalizeToTimeOnly(schedule.timeTo),
      durationMinutes,
      bufferMinutes,
    );

    return theoreticalSlots.map((slot) => {
      const isOccupied = schedule.bookedSlots.some((booked) =>
        timeRangesOverlap(slot.startTime, slot.endTime, booked.startTime, booked.endTime),
      );

      return {
        scheduleId: schedule.id,
        startTime: dateToTimeString(slot.startTime),
        endTime: dateToTimeString(slot.endTime),
        available: !isOccupied,
      };
    });
  }
}
