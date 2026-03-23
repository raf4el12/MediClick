import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GenerateSchedulesDto } from '../dto/generate-schedules.dto.js';
import { GenerateSchedulesResponseDto } from '../dto/generate-schedules-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import type { IAvailabilityRepository } from '../../../availability/domain/repositories/availability.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { CreateScheduleData } from '../../domain/interfaces/schedule-data.interface.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { TimeSlotCalculatorService } from '../../domain/services/time-slot-calculator.service.js';

const JS_DAY_TO_ENUM: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

@Injectable()
export class GenerateSchedulesUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  async execute(
    dto: GenerateSchedulesDto,
    jwtClinicId?: number | null,
  ): Promise<GenerateSchedulesResponseDto> {
    // ── Resolver rango de fechas ──
    const { rangeStart, rangeEnd, dates } = this.resolveDateRange(dto);

    // Determinar doctores a procesar
    const doctorClinicCache = new Map<number, number | null>();

    let doctorIds: number[];
    if (dto.doctorId) {
      const doctor = await this.doctorRepository.findById(dto.doctorId);
      if (!doctor) {
        throw new BadRequestException('El doctor especificado no existe');
      }

      if (jwtClinicId && doctor.clinicId !== jwtClinicId) {
        throw new ForbiddenException(
          'No puede generar horarios para un doctor de otra sede',
        );
      }

      doctorIds = [dto.doctorId];
      doctorClinicCache.set(dto.doctorId, doctor.clinicId ?? null);
    } else {
      const allAvailabilities =
        await this.availabilityRepository.findActiveByDoctorIds([]);

      const filteredAvailabilities = jwtClinicId
        ? allAvailabilities.filter((a) => a.clinicId === jwtClinicId)
        : allAvailabilities;

      doctorIds = [...new Set(filteredAvailabilities.map((a) => a.doctorId))];
    }

    if (doctorIds.length === 0) {
      return {
        generated: 0,
        skipped: 0,
        deleted: 0,
        message: 'No hay doctores con disponibilidad activa',
      };
    }

    // Pre-cargar feriados para el rango
    const holidays = await this.holidayRepository.findByDateRange(
      rangeStart,
      rangeEnd,
    );
    const holidayDatesSet = new Set(
      holidays.map((h) => h.date.toISOString().split('T')[0]),
    );

    // Cachear duraciones y buffer de especialidades
    const specialtyCache = new Map<
      number,
      { duration: number | null; bufferMinutes: number }
    >();

    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalDeleted = 0;

    for (const doctorId of doctorIds) {
      // Obtener availability rules del doctor
      let availabilities =
        await this.availabilityRepository.findActiveByDoctorIds([doctorId]);

      // Filtrar por especialidad si se especificó
      if (dto.specialtyId) {
        availabilities = availabilities.filter(
          (a) => a.specialtyId === dto.specialtyId,
        );
      }

      if (availabilities.length === 0) continue;

      // Resolver clinicId del doctor
      if (!doctorClinicCache.has(doctorId)) {
        const doc = await this.doctorRepository.findById(doctorId);
        doctorClinicCache.set(doctorId, doc?.clinicId ?? null);
      }
      const doctorClinicId = doctorClinicCache.get(doctorId) ?? null;

      // ── Overwrite: eliminar horarios no reservados ──
      if (dto.overwrite) {
        const deleted =
          await this.scheduleRepository.deleteUnbookedByDoctorAndDateRange(
            doctorId,
            rangeStart,
            rangeEnd,
          );
        totalDeleted += deleted;
      }

      // Pre-cargar bloqueos activos del doctor para el rango
      const scheduleBlocks =
        await this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
          doctorId,
          rangeStart,
          rangeEnd,
        );

      // Obtener schedules existentes para evitar duplicados
      const existingSchedules = await this.scheduleRepository.findExistingDates(
        doctorId,
        dates,
      );

      const existingSet = new Set(
        existingSchedules.map(
          (s) =>
            `${s.scheduleDate.toISOString().split('T')[0]}_${s.timeFrom.getTime()}_${s.timeTo.getTime()}`,
        ),
      );

      const schedulesToCreate: CreateScheduleData[] = [];

      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];

        // Saltar feriados
        if (holidayDatesSet.has(dateStr)) {
          continue;
        }

        // Verificar si el día completo está bloqueado
        const dateMs = date.getTime();
        const isFullDayBlocked = scheduleBlocks.some((block) => {
          if (block.type !== 'FULL_DAY') return false;
          const blockStart = Date.UTC(
            block.startDate.getUTCFullYear(),
            block.startDate.getUTCMonth(),
            block.startDate.getUTCDate(),
          );
          const blockEnd = Date.UTC(
            block.endDate.getUTCFullYear(),
            block.endDate.getUTCMonth(),
            block.endDate.getUTCDate(),
          );
          return dateMs >= blockStart && dateMs <= blockEnd;
        });

        if (isFullDayBlocked) {
          continue;
        }

        const jsDayOfWeek = date.getUTCDay();
        const dayOfWeek = JS_DAY_TO_ENUM[jsDayOfWeek];

        // Verificar vigencia y día de semana
        const matchingRules = availabilities.filter((a) => {
          if (a.dayOfWeek !== dayOfWeek) return false;
          if (!a.isAvailable) return false;
          if (!a.startDate || !a.endDate) return true;
          const startMs = Date.UTC(
            a.startDate.getUTCFullYear(),
            a.startDate.getUTCMonth(),
            a.startDate.getUTCDate(),
          );
          const endMs = Date.UTC(
            a.endDate.getUTCFullYear(),
            a.endDate.getUTCMonth(),
            a.endDate.getUTCDate(),
          );
          return dateMs >= startMs && dateMs <= endMs;
        });

        // Recopilar bloqueos TIME_RANGE para este día
        const timeRangeBlocks = scheduleBlocks.filter((block) => {
          if (block.type !== 'TIME_RANGE') return false;
          const blockStart = Date.UTC(
            block.startDate.getUTCFullYear(),
            block.startDate.getUTCMonth(),
            block.startDate.getUTCDate(),
          );
          const blockEnd = Date.UTC(
            block.endDate.getUTCFullYear(),
            block.endDate.getUTCMonth(),
            block.endDate.getUTCDate(),
          );
          return dateMs >= blockStart && dateMs <= blockEnd;
        });

        for (const rule of matchingRules) {
          // Obtener la duración y buffer de la especialidad (con caché)
          if (!specialtyCache.has(rule.specialtyId)) {
            const specialty = await this.specialtyRepository.findById(
              rule.specialtyId,
            );
            specialtyCache.set(rule.specialtyId, {
              duration: specialty?.duration ?? null,
              bufferMinutes: specialty?.bufferMinutes ?? 0,
            });
          }
          const { duration, bufferMinutes } = specialtyCache.get(
            rule.specialtyId,
          )!;

          // Fragmentar el rango en slots individuales si hay duración configurada
          let slots: { startTime: Date; endTime: Date }[];
          if (duration && duration > 0) {
            slots = TimeSlotCalculatorService.generate(
              rule.timeFrom,
              rule.timeTo,
              duration,
              bufferMinutes,
            );
          } else {
            slots = [{ startTime: rule.timeFrom, endTime: rule.timeTo }];
          }

          for (const slot of slots) {
            // Verificar si el slot se solapa con algún bloqueo TIME_RANGE
            const isSlotBlocked = timeRangeBlocks.some((block) => {
              if (!block.timeFrom || !block.timeTo) return false;
              return (
                slot.startTime < block.timeTo && slot.endTime > block.timeFrom
              );
            });

            if (isSlotBlocked) {
              totalSkipped++;
              continue;
            }

            const key = `${dateStr}_${slot.startTime.getTime()}_${slot.endTime.getTime()}`;

            if (existingSet.has(key)) {
              totalSkipped++;
              continue;
            }

            existingSet.add(key);
            schedulesToCreate.push({
              doctorId,
              specialtyId: rule.specialtyId,
              scheduleDate: date,
              timeFrom: slot.startTime,
              timeTo: slot.endTime,
              clinicId: doctorClinicId,
            });
          }
        }
      }

      if (schedulesToCreate.length > 0) {
        const created =
          await this.scheduleRepository.createMany(schedulesToCreate);
        totalGenerated += created;
      }
    }

    // Construir mensaje
    const parts: string[] = [`${totalGenerated} creados`];
    if (totalSkipped > 0) parts.push(`${totalSkipped} omitidos`);
    if (totalDeleted > 0) parts.push(`${totalDeleted} eliminados`);

    return {
      generated: totalGenerated,
      skipped: totalSkipped,
      deleted: totalDeleted,
      message: `Generación completada: ${parts.join(', ')}`,
    };
  }

  /**
   * Resuelve el rango de fechas a partir del DTO.
   * Soporta dos modos: month/year o dateFrom/dateTo.
   */
  private resolveDateRange(dto: GenerateSchedulesDto): {
    rangeStart: Date;
    rangeEnd: Date;
    dates: Date[];
  } {
    if (dto.dateFrom && dto.dateTo) {
      const rangeStart = new Date(dto.dateFrom + 'T00:00:00Z');
      const rangeEnd = new Date(dto.dateTo + 'T00:00:00Z');

      if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
        throw new BadRequestException(
          'Las fechas deben tener formato YYYY-MM-DD',
        );
      }
      if (rangeEnd < rangeStart) {
        throw new BadRequestException(
          'La fecha fin debe ser igual o posterior a la fecha inicio',
        );
      }

      // Limitar a máximo 366 días
      const diffDays =
        (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 366) {
        throw new BadRequestException('El rango no puede exceder 366 días');
      }

      const dates: Date[] = [];
      const current = new Date(rangeStart);
      while (current <= rangeEnd) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 1);
      }

      return { rangeStart, rangeEnd, dates };
    }

    // Modo month/year (retrocompatible)
    if (dto.month == null || dto.year == null) {
      throw new BadRequestException(
        'Debe indicar month/year o dateFrom/dateTo',
      );
    }
    if (dto.month < 1 || dto.month > 12) {
      throw new BadRequestException('El mes debe estar entre 1 y 12');
    }
    if (dto.year < 2020 || dto.year > 2100) {
      throw new BadRequestException('El año debe estar entre 2020 y 2100');
    }

    const daysInMonth = new Date(Date.UTC(dto.year, dto.month, 0)).getUTCDate();
    const rangeStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const rangeEnd = new Date(Date.UTC(dto.year, dto.month - 1, daysInMonth));

    const dates: Date[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(Date.UTC(dto.year, dto.month - 1, day)));
    }

    return { rangeStart, rangeEnd, dates };
  }
}
