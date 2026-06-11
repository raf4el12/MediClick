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
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { ScheduleBlockEntity } from '../../../schedule-blocks/domain/entities/schedule-block.entity.js';
import { TimeSlotCalculatorService } from '../../domain/services/time-slot-calculator.service.js';
import type { ScheduleWithBookedSlots } from '../../domain/interfaces/schedule-data.interface.js';
import {
  dateToTimeString,
  normalizeToTimeOnly,
  timeRangesOverlap,
  toMinutesUTC,
  nowInTimezone,
  todayStartInTimezone,
  scheduleDateToLocalDay,
  MIN_BOOKING_ANTICIPATION_MS,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';

/**
 * Use Case: Obtener time slots disponibles para un doctor en una fecha.
 *
 * Lógica auto-contenida:
 *  1. Busca los horarios (bloques generales) del doctor para la fecha y especialidad.
 *  2. Obtiene la duración de la especialidad.
 *  3. Fragmenta cada bloque en slots usando TimeSlotCalculatorService.
 *  4. Cruza con citas existentes, bloqueos del doctor y la ventana de
 *     anticipación (si la fecha es hoy) para marcar slots no disponibles.
 *  5. Días pasados o feriados no ofrecen slots.
 */
@Injectable()
export class GetAvailableTimeSlotsUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    private readonly timezoneResolver: TimezoneResolverService,
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

    // 2. Días sin atención: fecha pasada o feriado (global o de la sede del doctor)
    const date = new Date(dto.date);
    const tz = await this.timezoneResolver.resolveByDoctorId(dto.doctorId);
    const todayStart = todayStartInTimezone(tz);
    const dayStart = scheduleDateToLocalDay(date);

    if (dayStart < todayStart) {
      return [];
    }

    const doctorClinicId =
      await this.timezoneResolver.resolveClinicIdByDoctorId(dto.doctorId);
    const isHoliday = await this.holidayRepository.isHoliday(
      date,
      doctorClinicId ?? undefined,
    );
    if (isHoliday) {
      return [];
    }

    // 3. Buscar los horarios del doctor para esa fecha y especialidad,
    //    junto con las citas activas ya agendadas
    const schedules =
      await this.scheduleRepository.findByDoctorDateWithBookedSlots(
        dto.doctorId,
        date,
        dto.specialtyId,
      );

    if (schedules.length === 0) {
      return [];
    }

    const blocks =
      await this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
        dto.doctorId,
        date,
        date,
      );

    // Para hoy, los slots dentro de la ventana de anticipación no son reservables
    let minStartMsOfDay = 0;
    if (dayStart.getTime() === todayStart.getTime()) {
      const now = nowInTimezone(tz);
      const nowMsOfDay =
        (now.getHours() * 60 + now.getMinutes()) * 60 * 1000 +
        now.getSeconds() * 1000;
      minStartMsOfDay = nowMsOfDay + MIN_BOOKING_ANTICIPATION_MS;
    }

    // 4. Generar slots y cruzar con citas, bloqueos y anticipación
    const result: TimeSlotResponseDto[] = [];
    const bufferMinutes = specialty.bufferMinutes ?? 0;

    for (const schedule of schedules) {
      const slots = this.generateSlotsForSchedule(
        schedule,
        specialty.duration,
        bufferMinutes,
        blocks,
        minStartMsOfDay,
      );
      result.push(...slots);
    }

    return result;
  }

  /**
   * Genera los time slots para un bloque horario y marca como no disponibles
   * los que se superponen con citas existentes o bloqueos del doctor, y los
   * que caen dentro de la ventana de anticipación mínima.
   */
  private generateSlotsForSchedule(
    schedule: ScheduleWithBookedSlots,
    durationMinutes: number,
    bufferMinutes: number,
    blocks: ScheduleBlockEntity[],
    minStartMsOfDay: number,
  ): TimeSlotResponseDto[] {
    const theoreticalSlots = TimeSlotCalculatorService.generate(
      normalizeToTimeOnly(schedule.timeFrom),
      normalizeToTimeOnly(schedule.timeTo),
      durationMinutes,
      bufferMinutes,
    );

    return theoreticalSlots.map((slot) => {
      const isOccupied = schedule.bookedSlots.some((booked) =>
        timeRangesOverlap(
          slot.startTime,
          slot.endTime,
          booked.startTime,
          booked.endTime,
        ),
      );

      const isBlocked = blocks.some(
        (block) =>
          block.type === 'FULL_DAY' ||
          (block.timeFrom !== null &&
            block.timeTo !== null &&
            timeRangesOverlap(
              slot.startTime,
              slot.endTime,
              block.timeFrom,
              block.timeTo,
            )),
      );

      const isTooSoon =
        toMinutesUTC(slot.startTime) * 60 * 1000 < minStartMsOfDay;

      return {
        scheduleId: schedule.id,
        startTime: dateToTimeString(slot.startTime),
        endTime: dateToTimeString(slot.endTime),
        available: !isOccupied && !isBlocked && !isTooSoon,
      };
    });
  }
}
