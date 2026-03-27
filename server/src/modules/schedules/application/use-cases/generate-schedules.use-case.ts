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
      const result = await this.processDoctor(
        doctorId,
        dto,
        dates,
        rangeStart,
        rangeEnd,
        holidayDatesSet,
        doctorClinicCache,
        specialtyCache,
      );
      totalGenerated += result.generated;
      totalSkipped += result.skipped;
      totalDeleted += result.deleted;
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
   * Procesa la generación de horarios para un doctor individual.
   */
  private async processDoctor(
    doctorId: number,
    dto: GenerateSchedulesDto,
    dates: Date[],
    rangeStart: Date,
    rangeEnd: Date,
    holidayDatesSet: Set<string>,
    doctorClinicCache: Map<number, number | null>,
    specialtyCache: Map<number, { duration: number | null; bufferMinutes: number }>,
  ): Promise<{ generated: number; skipped: number; deleted: number }> {
    let skipped = 0;
    let deleted = 0;

    let availabilities =
      await this.availabilityRepository.findActiveByDoctorIds([doctorId]);

    if (dto.specialtyId) {
      availabilities = availabilities.filter(
        (a) => a.specialtyId === dto.specialtyId,
      );
    }

    if (availabilities.length === 0) {
      return { generated: 0, skipped: 0, deleted: 0 };
    }

    // Resolver clinicId del doctor
    if (!doctorClinicCache.has(doctorId)) {
      const doc = await this.doctorRepository.findById(doctorId);
      doctorClinicCache.set(doctorId, doc?.clinicId ?? null);
    }
    const doctorClinicId = doctorClinicCache.get(doctorId) ?? null;

    if (dto.overwrite) {
      deleted =
        await this.scheduleRepository.deleteUnbookedByDoctorAndDateRange(
          doctorId,
          rangeStart,
          rangeEnd,
        );
    }

    const scheduleBlocks =
      await this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
        doctorId,
        rangeStart,
        rangeEnd,
      );

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
      const result = await this.processDayForDoctor(
        date,
        doctorId,
        doctorClinicId,
        availabilities,
        scheduleBlocks,
        holidayDatesSet,
        existingSet,
        specialtyCache,
      );
      schedulesToCreate.push(...result.slots);
      skipped += result.skipped;
    }

    let generated = 0;
    if (schedulesToCreate.length > 0) {
      generated = await this.scheduleRepository.createMany(schedulesToCreate);
    }

    return { generated, skipped, deleted };
  }

  /**
   * Procesa un día específico para un doctor: verifica feriados, bloqueos,
   * y genera los slots correspondientes.
   */
  private async processDayForDoctor(
    date: Date,
    doctorId: number,
    doctorClinicId: number | null,
    availabilities: any[],
    scheduleBlocks: any[],
    holidayDatesSet: Set<string>,
    existingSet: Set<string>,
    specialtyCache: Map<number, { duration: number | null; bufferMinutes: number }>,
  ): Promise<{ slots: CreateScheduleData[]; skipped: number }> {
    const slots: CreateScheduleData[] = [];
    let skipped = 0;
    const dateStr = date.toISOString().split('T')[0];

    if (holidayDatesSet.has(dateStr)) {
      return { slots, skipped };
    }

    const dateMs = date.getTime();

    if (this.isFullDayBlocked(dateMs, scheduleBlocks)) {
      return { slots, skipped };
    }

    const dayOfWeek = JS_DAY_TO_ENUM[date.getUTCDay()];

    const matchingRules = availabilities.filter((a) => {
      if (a.dayOfWeek !== dayOfWeek || !a.isAvailable) return false;
      if (!a.startDate || !a.endDate) return true;
      const startMs = Date.UTC(a.startDate.getUTCFullYear(), a.startDate.getUTCMonth(), a.startDate.getUTCDate());
      const endMs = Date.UTC(a.endDate.getUTCFullYear(), a.endDate.getUTCMonth(), a.endDate.getUTCDate());
      return dateMs >= startMs && dateMs <= endMs;
    });

    const timeRangeBlocks = this.getTimeRangeBlocks(dateMs, scheduleBlocks);

    for (const rule of matchingRules) {
      const result = await this.generateSlotsForRule(
        rule,
        date,
        dateStr,
        doctorId,
        doctorClinicId,
        timeRangeBlocks,
        existingSet,
        specialtyCache,
      );
      slots.push(...result.slots);
      skipped += result.skipped;
    }

    return { slots, skipped };
  }

  /**
   * Genera los slots individuales para una regla de disponibilidad.
   */
  private async generateSlotsForRule(
    rule: any,
    date: Date,
    dateStr: string,
    doctorId: number,
    doctorClinicId: number | null,
    timeRangeBlocks: any[],
    existingSet: Set<string>,
    specialtyCache: Map<number, { duration: number | null; bufferMinutes: number }>,
  ): Promise<{ slots: CreateScheduleData[]; skipped: number }> {
    const slots: CreateScheduleData[] = [];
    let skipped = 0;

    if (!specialtyCache.has(rule.specialtyId)) {
      const specialty = await this.specialtyRepository.findById(rule.specialtyId);
      specialtyCache.set(rule.specialtyId, {
        duration: specialty?.duration ?? null,
        bufferMinutes: specialty?.bufferMinutes ?? 0,
      });
    }
    const { duration, bufferMinutes } = specialtyCache.get(rule.specialtyId)!;

    let timeSlots: { startTime: Date; endTime: Date }[];
    if (duration && duration > 0) {
      timeSlots = TimeSlotCalculatorService.generate(
        rule.timeFrom,
        rule.timeTo,
        duration,
        bufferMinutes,
      );
    } else {
      timeSlots = [{ startTime: rule.timeFrom, endTime: rule.timeTo }];
    }

    for (const slot of timeSlots) {
      const isBlocked = timeRangeBlocks.some((block) => {
        if (!block.timeFrom || !block.timeTo) return false;
        return slot.startTime < block.timeTo && slot.endTime > block.timeFrom;
      });

      if (isBlocked) {
        skipped++;
        continue;
      }

      const key = `${dateStr}_${slot.startTime.getTime()}_${slot.endTime.getTime()}`;

      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      existingSet.add(key);
      slots.push({
        doctorId,
        specialtyId: rule.specialtyId,
        scheduleDate: date,
        timeFrom: slot.startTime,
        timeTo: slot.endTime,
        clinicId: doctorClinicId,
      });
    }

    return { slots, skipped };
  }

  private isFullDayBlocked(dateMs: number, scheduleBlocks: any[]): boolean {
    return scheduleBlocks.some((block) => {
      if (block.type !== 'FULL_DAY') return false;
      const blockStart = Date.UTC(block.startDate.getUTCFullYear(), block.startDate.getUTCMonth(), block.startDate.getUTCDate());
      const blockEnd = Date.UTC(block.endDate.getUTCFullYear(), block.endDate.getUTCMonth(), block.endDate.getUTCDate());
      return dateMs >= blockStart && dateMs <= blockEnd;
    });
  }

  private getTimeRangeBlocks(dateMs: number, scheduleBlocks: any[]): any[] {
    return scheduleBlocks.filter((block) => {
      if (block.type !== 'TIME_RANGE') return false;
      const blockStart = Date.UTC(block.startDate.getUTCFullYear(), block.startDate.getUTCMonth(), block.startDate.getUTCDate());
      const blockEnd = Date.UTC(block.endDate.getUTCFullYear(), block.endDate.getUTCMonth(), block.endDate.getUTCDate());
      return dateMs >= blockStart && dateMs <= blockEnd;
    });
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
