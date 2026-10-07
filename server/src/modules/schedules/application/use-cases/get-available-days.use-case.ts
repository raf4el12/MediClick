import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetAvailableDaysQueryDto } from '../dto/get-available-days-query.dto.js';
import { AvailableDaysResponseDto } from '../dto/available-days-response.dto.js';
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
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Día de agenda (medianoche UTC); rechaza fechas que no existen, como 2099-02-30. */
function parseDay(value: string, field: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dayKey(date) !== value) {
    throw new BadRequestException(`${field} no es una fecha válida`);
  }
  return date;
}
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Use Case: días con cupos libres de un médico para una especialidad en un
 * rango de días locales de su sede. Cuenta los cupos con el mismo cálculo que
 * `time-slots` (`computeSlots`), para que el calendario y la lista de cupos
 * del día nunca discrepen.
 */
@Injectable()
export class GetAvailableDaysUseCase {
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

  async execute(
    dto: GetAvailableDaysQueryDto,
    actorClinicId: number | null,
  ): Promise<AvailableDaysResponseDto> {
    const from = parseDay(dto.dateFrom, 'dateFrom');
    const to = parseDay(dto.dateTo, 'dateTo');

    const rangeDays = (to.getTime() - from.getTime()) / DAY_MS + 1;
    if (rangeDays < 1) {
      throw new BadRequestException('dateTo no puede ser anterior a dateFrom');
    }
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `El rango no puede superar ${MAX_RANGE_DAYS} días`,
      );
    }

    const specialty = await this.specialtyRepository.findById(dto.specialtyId);
    if (!specialty) {
      throw new NotFoundException('La especialidad especificada no existe');
    }
    if (!specialty.duration || specialty.duration <= 0) {
      throw new BadRequestException(
        'La especialidad no tiene una duración configurada',
      );
    }

    // El personal de sede solo consulta médicos de su sede; el paciente y el
    // administrador global (sin sede) consultan cualquiera.
    const doctorClinicId =
      await this.timezoneResolver.resolveClinicIdByDoctorId(dto.doctorId);
    if (actorClinicId !== null && doctorClinicId !== actorClinicId) {
      throw new NotFoundException('Médico no encontrado');
    }

    const timezone = await this.timezoneResolver.resolveByDoctorId(
      dto.doctorId,
    );

    const [schedules, bookings, holidays, blocks] = await Promise.all([
      this.scheduleRepository.findByDoctorRange(
        dto.doctorId,
        from,
        to,
        dto.specialtyId,
      ),
      this.scheduleRepository.findDoctorBookingsInRange(dto.doctorId, from, to),
      this.holidayRepository.findActiveInRangeForClinic(
        from,
        to,
        doctorClinicId,
      ),
      this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
        dto.doctorId,
        from,
        to,
      ),
    ]);
    const holidayDays = new Set(
      holidays.map((holiday) => dayKey(holiday.date)),
    );

    const todayKey = dayKey(todayStartInTimezone(timezone));
    const todayMinStart = todayMinStartMsOfDay(nowInTimezone(timezone));

    const counts = new Map<string, number>();
    for (const schedule of schedules) {
      const key = dayKey(schedule.scheduleDate);
      if (key < todayKey || holidayDays.has(key)) continue;
      const available = computeSlots({
        schedule,
        durationMinutes: specialty.duration,
        bufferMinutes: specialty.bufferMinutes ?? 0,
        doctorBookings: bookings.filter((b) => dayKey(b.scheduleDate) === key),
        blocks: blocks.filter(
          (block) =>
            dayKey(block.startDate) <= key && key <= dayKey(block.endDate),
        ),
        minStartMsOfDay: key === todayKey ? todayMinStart : 0,
      }).filter((slot) => slot.available).length;
      counts.set(key, (counts.get(key) ?? 0) + available);
    }

    return {
      doctorId: dto.doctorId,
      specialtyId: dto.specialtyId,
      timezone,
      days: [...counts.entries()]
        .filter(([, availableCount]) => availableCount > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, availableCount]) => ({ date, availableCount })),
    };
  }
}
