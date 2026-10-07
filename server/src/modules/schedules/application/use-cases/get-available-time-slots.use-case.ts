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
import {
  computeSlots,
  todayMinStartMsOfDay,
} from '../../domain/services/slot-availability.js';
import {
  nowInTimezone,
  todayStartInTimezone,
  scheduleDateToLocalDay,
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

    // 3. Bloques de agenda del doctor para esa fecha y especialidad
    const schedules = await this.scheduleRepository.findByDoctorRange(
      dto.doctorId,
      date,
      date,
      dto.specialtyId,
    );

    if (schedules.length === 0) {
      return [];
    }

    const doctorBookings =
      await this.scheduleRepository.findDoctorBookingsInRange(
        dto.doctorId,
        date,
        date,
      );

    const blocks =
      await this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
        dto.doctorId,
        date,
        date,
      );

    // Para hoy, los slots dentro de la ventana de anticipación no son reservables
    const minStartMsOfDay =
      dayStart.getTime() === todayStart.getTime()
        ? todayMinStartMsOfDay(nowInTimezone(tz))
        : 0;

    // 4. Generar slots y cruzar con las citas del médico, bloqueos y anticipación
    const result: TimeSlotResponseDto[] = [];
    for (const schedule of schedules) {
      result.push(
        ...computeSlots({
          schedule,
          durationMinutes: specialty.duration,
          bufferMinutes: specialty.bufferMinutes ?? 0,
          doctorBookings,
          blocks,
          minStartMsOfDay,
        }),
      );
    }

    return result;
  }
}
