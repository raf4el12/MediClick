import type { ScheduleBlockEntity } from '../../../schedule-blocks/domain/entities/schedule-block.entity.js';
import { TimeSlotCalculatorService } from './time-slot-calculator.service.js';
import {
  dateToTimeString,
  normalizeToTimeOnly,
  timeRangesOverlap,
  toMinutesUTC,
  MIN_BOOKING_ANTICIPATION_MS,
} from '../../../../shared/utils/date-time.utils.js';

export interface SlotSchedule {
  id: number;
  timeFrom: Date;
  timeTo: Date;
}

export interface ComputedSlot {
  scheduleId: number;
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Fragmenta un bloque de agenda en cupos y marca como no disponibles los que
 * se solapan con una cita activa del médico (de cualquier especialidad), con
 * un bloqueo de agenda, o los que empiezan antes de `minStartMsOfDay`.
 *
 * `time-slots`, `available-days` y la agenda comparten este cálculo para que
 * un cupo se ofrezca libre con el mismo criterio en todas partes.
 */
export function computeSlots(input: {
  schedule: SlotSchedule;
  durationMinutes: number;
  bufferMinutes: number;
  doctorBookings: { startTime: Date; endTime: Date }[];
  blocks: Pick<ScheduleBlockEntity, 'type' | 'timeFrom' | 'timeTo'>[];
  minStartMsOfDay: number;
}): ComputedSlot[] {
  const { schedule, doctorBookings, blocks, minStartMsOfDay } = input;
  const theoreticalSlots = TimeSlotCalculatorService.generate(
    normalizeToTimeOnly(schedule.timeFrom),
    normalizeToTimeOnly(schedule.timeTo),
    input.durationMinutes,
    input.bufferMinutes,
  );

  return theoreticalSlots.map((slot) => {
    const isOccupied = doctorBookings.some((booked) =>
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

/**
 * Primer instante del día (ms desde medianoche, reloj de la sede) en el que
 * puede empezar un cupo de hoy: ahora más la anticipación mínima.
 * `now` debe venir de `nowInTimezone(tz)`.
 */
export function todayMinStartMsOfDay(now: Date): number {
  const nowMsOfDay =
    (now.getHours() * 60 + now.getMinutes()) * 60 * 1000 +
    now.getSeconds() * 1000;
  return nowMsOfDay + MIN_BOOKING_ANTICIPATION_MS;
}
