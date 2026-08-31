import type { AvailabilityEntity } from '../../../availability/domain/entities/availability.entity.js';
import type { HolidayEntity } from '../../../holidays/domain/entities/holiday.entity.js';
import type { ScheduleBlockEntity } from '../../../schedule-blocks/domain/entities/schedule-block.entity.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import type { CreateScheduleData } from '../interfaces/schedule-data.interface.js';
import { TimeSlotCalculatorService } from './time-slot-calculator.service.js';

const JS_DAY_TO_ENUM: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

export interface ScheduleSpecialtyConfig {
  duration: number | null;
  bufferMinutes: number;
}

export interface ExistingScheduleIdentity {
  specialtyId: number;
  clinicId: number | null;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
}

export interface GenerationInput {
  doctorId: number;
  clinicId: number | null;
  dates: readonly Date[];
  availabilities: readonly AvailabilityEntity[];
  holidays: readonly HolidayEntity[];
  scheduleBlocks: readonly ScheduleBlockEntity[];
  specialties: ReadonlyMap<number, ScheduleSpecialtyConfig>;
  existingSchedules: readonly ExistingScheduleIdentity[];
}

export type GenerationRejectionReason =
  | 'HOLIDAY'
  | 'FULL_DAY_BLOCK'
  | 'TIME_RANGE_BLOCK'
  | 'EXCEPTION'
  | 'EXISTING_SLOT';

export interface GenerationRejection {
  reason: GenerationRejectionReason;
  date: string;
  specialtyId?: number;
  timeFrom?: Date;
  timeTo?: Date;
}

export interface GenerationPlan {
  desired: CreateScheduleData[];
  skipped: GenerationRejection[];
}

/**
 * Módulo puro que decide qué cupos deberían existir para un médico. Los
 * repositorios cargan los datos y el caso de uso persiste el plan resultante.
 */
export class ScheduleGenerationPlanner {
  plan(input: GenerationInput): GenerationPlan {
    const desired: CreateScheduleData[] = [];
    const skipped: GenerationRejection[] = [];
    const existingKeys = new Set(
      input.existingSchedules.map((schedule) =>
        this.scheduleKey(
          input.doctorId,
          schedule.specialtyId,
          schedule.clinicId,
          this.dateString(schedule.scheduleDate),
          schedule.timeFrom,
          schedule.timeTo,
        ),
      ),
    );
    const relevantHolidayDates = new Set(
      input.holidays
        .filter(
          (holiday) =>
            holiday.isActive &&
            (holiday.clinicId === null || holiday.clinicId === input.clinicId),
        )
        .map((holiday) => this.dateString(holiday.date)),
    );

    for (const date of input.dates) {
      const dateString = this.dateString(date);
      if (relevantHolidayDates.has(dateString)) {
        skipped.push({ reason: 'HOLIDAY', date: dateString });
        continue;
      }

      const dateMs = date.getTime();
      const activeBlocks = input.scheduleBlocks.filter(
        (block) => block.isActive && this.blockAppliesToDate(block, dateMs),
      );
      if (activeBlocks.some((block) => block.type === 'FULL_DAY')) {
        skipped.push({ reason: 'FULL_DAY_BLOCK', date: dateString });
        continue;
      }

      const dayRules = input.availabilities.filter((availability) =>
        this.ruleAppliesToDate(availability, dateMs),
      );
      const exceptions = dayRules.filter(
        (rule) => rule.type === AvailabilityType.EXCEPTION,
      );
      const generatingRules = dayRules.filter(
        (rule) => rule.type !== AvailabilityType.EXCEPTION,
      );
      const timeRangeBlocks = activeBlocks.filter(
        (block) => block.type === 'TIME_RANGE',
      );

      for (const rule of generatingRules) {
        const specialty = input.specialties.get(rule.specialtyId);
        const slots = this.calculateSlots(rule, specialty);
        const ruleExceptions = exceptions.filter(
          (exception) => exception.specialtyId === rule.specialtyId,
        );

        for (const slot of slots) {
          const rejection = this.slotRejection(
            slot,
            dateString,
            rule.specialtyId,
            ruleExceptions,
            timeRangeBlocks,
            input,
            existingKeys,
          );
          if (rejection) {
            skipped.push(rejection);
            continue;
          }

          const key = this.scheduleKey(
            input.doctorId,
            rule.specialtyId,
            input.clinicId,
            dateString,
            slot.startTime,
            slot.endTime,
          );
          existingKeys.add(key);
          desired.push({
            doctorId: input.doctorId,
            specialtyId: rule.specialtyId,
            scheduleDate: date,
            timeFrom: slot.startTime,
            timeTo: slot.endTime,
            clinicId: input.clinicId,
          });
        }
      }
    }

    return { desired, skipped };
  }

  private ruleAppliesToDate(rule: AvailabilityEntity, dateMs: number): boolean {
    if (
      !rule.isAvailable ||
      rule.dayOfWeek !== JS_DAY_TO_ENUM[new Date(dateMs).getUTCDay()]
    ) {
      return false;
    }
    if (!rule.startDate || !rule.endDate) return true;
    return (
      dateMs >= this.utcDateMs(rule.startDate) &&
      dateMs <= this.utcDateMs(rule.endDate)
    );
  }

  private blockAppliesToDate(
    block: ScheduleBlockEntity,
    dateMs: number,
  ): boolean {
    return (
      dateMs >= this.utcDateMs(block.startDate) &&
      dateMs <= this.utcDateMs(block.endDate)
    );
  }

  private calculateSlots(
    rule: AvailabilityEntity,
    specialty?: ScheduleSpecialtyConfig,
  ): { startTime: Date; endTime: Date }[] {
    if (specialty?.duration && specialty.duration > 0) {
      return TimeSlotCalculatorService.generate(
        rule.timeFrom,
        rule.timeTo,
        specialty.duration,
        specialty.bufferMinutes,
      );
    }
    return [{ startTime: rule.timeFrom, endTime: rule.timeTo }];
  }

  private slotRejection(
    slot: { startTime: Date; endTime: Date },
    date: string,
    specialtyId: number,
    exceptions: readonly AvailabilityEntity[],
    timeRangeBlocks: readonly ScheduleBlockEntity[],
    input: GenerationInput,
    existingKeys: ReadonlySet<string>,
  ): GenerationRejection | null {
    const base = {
      date,
      specialtyId,
      timeFrom: slot.startTime,
      timeTo: slot.endTime,
    };
    if (timeRangeBlocks.some((block) => this.overlaps(slot, block))) {
      return { reason: 'TIME_RANGE_BLOCK', ...base };
    }
    if (exceptions.some((exception) => this.overlaps(slot, exception))) {
      return { reason: 'EXCEPTION', ...base };
    }
    const key = this.scheduleKey(
      input.doctorId,
      specialtyId,
      input.clinicId,
      date,
      slot.startTime,
      slot.endTime,
    );
    return existingKeys.has(key) ? { reason: 'EXISTING_SLOT', ...base } : null;
  }

  private overlaps(
    slot: { startTime: Date; endTime: Date },
    restriction: { timeFrom: Date | null; timeTo: Date | null },
  ): boolean {
    return Boolean(
      restriction.timeFrom &&
      restriction.timeTo &&
      slot.startTime < restriction.timeTo &&
      slot.endTime > restriction.timeFrom,
    );
  }

  private scheduleKey(
    doctorId: number,
    specialtyId: number,
    clinicId: number | null,
    date: string,
    timeFrom: Date,
    timeTo: Date,
  ): string {
    return `${doctorId}:${specialtyId}:${clinicId ?? 'global'}:${date}:${timeFrom.getTime()}:${timeTo.getTime()}`;
  }

  private dateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private utcDateMs(date: Date): number {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }
}
