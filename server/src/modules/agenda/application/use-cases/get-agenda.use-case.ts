import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  dateToTimeString,
  nowInTimezone,
  todayStartInTimezone,
} from '../../../../shared/utils/date-time.utils.js';
import {
  computeSlots,
  todayMinStartMsOfDay,
} from '../../../schedules/domain/services/slot-availability.js';
import type {
  AgendaRows,
  IAgendaReadRepository,
} from '../../domain/repositories/agenda-read.repository.js';
import { resolveAgendaScope } from '../../domain/services/agenda-scope.policy.js';
import {
  computeAgendaIndicators,
  type IndicatorCupo,
} from '../../domain/services/agenda-indicators.js';
import type { AgendaQueryDto } from '../dto/agenda-query.dto.js';
import type {
  AgendaCupoDto,
  AgendaResponseDto,
} from '../dto/agenda-response.dto.js';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Día de agenda (medianoche UTC); rechaza fechas que no existen, como 2099-02-30. */
function parseDay(value: string, field: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dayKey(date) !== value) {
    throw new BadRequestException(`${field} no es una fecha válida`);
  }
  return date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Vista mensual de 6 semanas para un médico; una semana para toda una sede. */
const MAX_RANGE_DAYS = { doctor: 42, clinic: 7 } as const;
const NOT_OCCUPYING = new Set<AppointmentStatus>([
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
]);

type AgendaCupo = AgendaCupoDto & IndicatorCupo;

/**
 * Use Case: agenda de un médico o de una sede en un rango de días locales.
 * Solo lectura. Los cupos usan el mismo cálculo que `time-slots` y
 * `available-days` (`computeSlots`), y los indicadores se calculan sobre los
 * mismos cupos y citas que se devuelven.
 */
@Injectable()
export class GetAgendaUseCase {
  constructor(
    @Inject('IAgendaReadRepository')
    private readonly repository: IAgendaReadRepository,
  ) {}

  async execute(
    actor: AuthenticatedUser,
    query: AgendaQueryDto,
  ): Promise<AgendaResponseDto> {
    const from = parseDay(query.from, 'from');
    const to = parseDay(query.to, 'to');
    const rangeDays = (to.getTime() - from.getTime()) / DAY_MS + 1;
    if (rangeDays < 1) {
      throw new BadRequestException('to no puede ser anterior a from');
    }

    const scope = await resolveAgendaScope(
      actor,
      { doctorId: query.doctorId, clinicId: query.clinicId },
      this.repository,
    );
    const maxDays = MAX_RANGE_DAYS[scope.kind];
    if (rangeDays > maxDays) {
      throw new BadRequestException(
        `El rango no puede superar ${maxDays} días para la agenda ${scope.kind === 'doctor' ? 'de un médico' : 'de una sede'}`,
      );
    }

    const rows = await this.repository.load(scope, from, to);
    const cupos = this.buildCupos(rows);

    return {
      timezone: rows.timezone,
      range: { from: query.from, to: query.to },
      doctors: rows.doctors.map((doctor) => ({
        id: doctor.id,
        fullName: `${doctor.name} ${doctor.lastName}`,
        specialties: doctor.specialties,
      })),
      cupos: cupos.map((cupo) => ({
        scheduleId: cupo.scheduleId,
        doctorId: cupo.doctorId,
        specialtyId: cupo.specialtyId,
        date: cupo.date,
        startTime: cupo.startTime,
        endTime: cupo.endTime,
        available: cupo.available,
      })),
      appointments: rows.appointments.map((appointment) => ({
        id: appointment.id,
        scheduleId: appointment.scheduleId,
        doctorId: appointment.doctorId,
        specialtyId: appointment.specialtyId,
        date: dayKey(appointment.scheduleDate),
        startTime: dateToTimeString(appointment.startTime),
        endTime: dateToTimeString(appointment.endTime),
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        isOverbook: appointment.isOverbook,
        isAtRisk: appointment.isAtRisk,
        patient: {
          id: appointment.patient.id,
          fullName: `${appointment.patient.name} ${appointment.patient.lastName}`,
        },
      })),
      blocks: rows.blocks.map((block) => ({
        id: block.id,
        doctorId: block.doctorId,
        type: block.type,
        startDate: dayKey(block.startDate),
        endDate: dayKey(block.endDate),
        timeFrom: block.timeFrom ? dateToTimeString(block.timeFrom) : null,
        timeTo: block.timeTo ? dateToTimeString(block.timeTo) : null,
        reason: block.reason,
      })),
      holidays: rows.holidays.map((holiday) => ({
        id: holiday.id,
        date: dayKey(holiday.date),
        name: holiday.name,
        scope: holiday.clinicId === null ? 'GLOBAL' : 'CLINIC',
      })),
      indicators: computeAgendaIndicators(cupos, rows.appointments, new Date()),
    };
  }

  private buildCupos(rows: AgendaRows): AgendaCupo[] {
    const todayKey = dayKey(todayStartInTimezone(rows.timezone));
    const todayMinStart = todayMinStartMsOfDay(nowInTimezone(rows.timezone));
    const holidayDays = new Set(rows.holidays.map((h) => dayKey(h.date)));

    // Un médico no tiene citas activas solapadas: ocupan sus cupos de
    // cualquier especialidad ese día.
    const bookings = new Map<string, { startTime: Date; endTime: Date }[]>();
    for (const appointment of rows.appointments) {
      if (NOT_OCCUPYING.has(appointment.status)) continue;
      const key = `${appointment.doctorId}|${dayKey(appointment.scheduleDate)}`;
      bookings.set(key, [...(bookings.get(key) ?? []), appointment]);
    }

    return rows.schedules.flatMap((schedule) => {
      const date = dayKey(schedule.scheduleDate);
      const isHoliday = holidayDays.has(date);
      const doctorBookings = bookings.get(`${schedule.doctorId}|${date}`) ?? [];
      const blocks = rows.blocks.filter(
        (block) =>
          block.doctorId === schedule.doctorId &&
          dayKey(block.startDate) <= date &&
          date <= dayKey(block.endDate),
      );
      const base = {
        schedule,
        durationMinutes: schedule.durationMinutes,
        bufferMinutes: schedule.bufferMinutes,
      };

      const slots = computeSlots({
        ...base,
        doctorBookings,
        blocks,
        minStartMsOfDay: date === todayKey ? todayMinStart : 0,
      });
      // Mismo cálculo con una sola causa a la vez: distingue un cupo ocupado
      // de uno anulado para los indicadores.
      const occupancy = computeSlots({
        ...base,
        doctorBookings,
        blocks: [],
        minStartMsOfDay: 0,
      });
      const blocking = computeSlots({
        ...base,
        doctorBookings: [],
        blocks,
        minStartMsOfDay: 0,
      });

      return slots.map((slot, index) => ({
        scheduleId: schedule.id,
        doctorId: schedule.doctorId,
        specialtyId: schedule.specialtyId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: slot.available && !isHoliday && date >= todayKey,
        booked: !occupancy[index].available,
        annulled: isHoliday || !blocking[index].available,
      }));
    });
  }
}
