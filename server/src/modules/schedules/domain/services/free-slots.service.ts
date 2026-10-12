import { Inject, Injectable } from '@nestjs/common';
import type { IScheduleRepository } from '../repositories/schedule.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { SlotWindow } from '../interfaces/schedule-data.interface.js';
import { computeSlots, todayMinStartMsOfDay } from './slot-availability.js';
import {
  nowInTimezone,
  parseHHmm,
  todayStartInTimezone,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';

export interface FreeSlot {
  scheduleId: number;
  clinicId: number | null;
  /** Hora con base 1970-01-01 UTC, como `Appointments.startTime`. */
  startTime: Date;
  endTime: Date;
}

export interface FreeSlotsFilter {
  doctorId?: number;
  clinicId?: number;
  from: Date;
  to: Date;
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Cupos reservables de un rango de días con el mismo criterio que
 * `time-slots` y `available-days` (`computeSlots`): sin cita activa del
 * médico, sin bloqueo vigente, fuera de feriados y, si es hoy, después de la
 * anticipación mínima en la zona de la sede. Días pasados no cuentan.
 */
@Injectable()
export class FreeSlotsService {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    private readonly timezoneResolver: TimezoneResolverService,
  ) {}

  async find(filter: FreeSlotsFilter): Promise<FreeSlot[]> {
    const windows =
      await this.scheduleRepository.findSlotWindowsInRange(filter);
    const byDoctor = new Map<number, SlotWindow[]>();
    for (const window of windows) {
      byDoctor.set(window.doctorId, [
        ...(byDoctor.get(window.doctorId) ?? []),
        window,
      ]);
    }

    const free: FreeSlot[] = [];
    for (const [doctorId, doctorWindows] of byDoctor) {
      free.push(...(await this.findForDoctor(doctorId, doctorWindows, filter)));
    }
    return free;
  }

  private async findForDoctor(
    doctorId: number,
    windows: SlotWindow[],
    filter: FreeSlotsFilter,
  ): Promise<FreeSlot[]> {
    const clinicId = windows[0].clinicId;
    const [timezone, bookings, blocks, holidays] = await Promise.all([
      this.timezoneResolver.resolveByDoctorId(doctorId),
      this.scheduleRepository.findDoctorBookingsInRange(
        doctorId,
        filter.from,
        filter.to,
      ),
      this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
        doctorId,
        filter.from,
        filter.to,
      ),
      this.holidayRepository.findActiveInRangeForClinic(
        filter.from,
        filter.to,
        clinicId,
      ),
    ]);
    const holidayDays = new Set(holidays.map((h) => dayKey(h.date)));
    const todayKey = dayKey(todayStartInTimezone(timezone));
    const todayMinStart = todayMinStartMsOfDay(nowInTimezone(timezone));

    const free: FreeSlot[] = [];
    for (const window of windows) {
      const key = dayKey(window.scheduleDate);
      if (key < todayKey || holidayDays.has(key)) continue;
      const slots = computeSlots({
        schedule: window,
        durationMinutes: window.durationMinutes,
        bufferMinutes: window.bufferMinutes,
        doctorBookings: bookings.filter((b) => dayKey(b.scheduleDate) === key),
        blocks: blocks.filter(
          (block) =>
            dayKey(block.startDate) <= key && key <= dayKey(block.endDate),
        ),
        minStartMsOfDay: key === todayKey ? todayMinStart : 0,
      });
      for (const slot of slots) {
        if (!slot.available) continue;
        free.push({
          scheduleId: window.id,
          clinicId: window.clinicId,
          startTime: parseHHmm(slot.startTime),
          endTime: parseHHmm(slot.endTime),
        });
      }
    }
    return free;
  }
}
