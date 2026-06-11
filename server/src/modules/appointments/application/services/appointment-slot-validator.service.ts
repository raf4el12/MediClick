import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import {
  dateToTimeString,
  toMinutesUTC,
  nowInTimezone,
  todayStartInTimezone,
  scheduleDateToLocalDay,
  MIN_BOOKING_ANTICIPATION_MS,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';

export interface ValidateSlotParams {
  doctorId: number;
  scheduleDate: Date;
  /** Hora de inicio del turno (schedule.timeFrom) */
  schedTimeFrom: Date;
  /** Hora de fin del turno (schedule.timeTo) */
  schedTimeTo: Date;
  /** Hora de inicio del slot solicitado (hora-only) */
  slotStart: Date;
  /** Hora de fin del slot solicitado (hora-only) */
  slotEnd: Date;
  /** Duración configurada de la especialidad en minutos (specialty.duration) */
  durationMinutes: number;
  /** Descanso entre slots consecutivos en minutos (specialty.bufferMinutes) */
  bufferMinutes?: number | null;
  /** clinicId del JWT; si se provee, valida que el doctor sea de la misma sede */
  jwtClinicId?: number | null;
}

/**
 * Centraliza las precondiciones de un slot para agendar/reagendar una cita:
 * rango del turno, duración y alineación a la grilla, fecha pasada,
 * anticipación mínima, sede, feriado y bloqueo.
 *
 * Existe para que create y reschedule apliquen exactamente las mismas reglas
 * (reschedule las omitía → se podía reagendar a fechas pasadas, feriados o
 * bloqueos del doctor). El overlap check queda fuera porque vive dentro de la
 * transacción serializable del repositorio.
 */
@Injectable()
export class AppointmentSlotValidatorService {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    private readonly timezoneResolver: TimezoneResolverService,
  ) {}

  /**
   * Valida todas las precondiciones del slot y retorna el clinicId del doctor.
   * Lanza la excepción correspondiente si alguna regla no se cumple.
   */
  async validate(params: ValidateSlotParams): Promise<number | null> {
    const {
      doctorId,
      scheduleDate,
      schedTimeFrom,
      schedTimeTo,
      slotStart,
      slotEnd,
      durationMinutes,
      bufferMinutes,
      jwtClinicId,
    } = params;

    if (slotStart.getTime() >= slotEnd.getTime()) {
      throw new BadRequestException('startTime debe ser anterior a endTime');
    }

    // ── Slot dentro del rango del turno ──
    const schedFromMinutes = toMinutesUTC(schedTimeFrom);
    const schedToMinutes = toMinutesUTC(schedTimeTo);
    const slotStartMinutes = toMinutesUTC(slotStart);
    const slotEndMinutes = toMinutesUTC(slotEnd);

    if (
      slotStartMinutes < schedFromMinutes ||
      slotEndMinutes > schedToMinutes
    ) {
      throw new BadRequestException(
        `El slot ${dateToTimeString(slotStart)}-${dateToTimeString(slotEnd)} está fuera del rango del turno ` +
          `${dateToTimeString(schedTimeFrom)}-${dateToTimeString(schedTimeTo)}`,
      );
    }

    // ── Duración exacta y alineación a la grilla de la especialidad ──
    if (!durationMinutes || durationMinutes <= 0) {
      throw new BadRequestException(
        'La especialidad no tiene una duración configurada',
      );
    }

    if (slotEndMinutes - slotStartMinutes !== durationMinutes) {
      throw new BadRequestException(
        `El slot debe durar exactamente ${durationMinutes} minutos`,
      );
    }

    const gridStep = durationMinutes + (bufferMinutes ?? 0);
    if ((slotStartMinutes - schedFromMinutes) % gridStep !== 0) {
      throw new BadRequestException(
        'El slot no está alineado a la grilla de horarios de la especialidad',
      );
    }

    // ── Validación de fecha/hora (zona horaria de la sede del doctor) ──
    const tz = await this.timezoneResolver.resolveByDoctorId(doctorId);
    const now = nowInTimezone(tz);
    const todayStart = todayStartInTimezone(tz);
    const scheduleDayStart = scheduleDateToLocalDay(scheduleDate);

    if (scheduleDayStart < todayStart) {
      throw new BadRequestException(
        'No se puede agendar una cita en una fecha pasada',
      );
    }

    if (scheduleDayStart.getTime() === todayStart.getTime()) {
      const scheduleDateTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        slotStart.getUTCHours(),
        slotStart.getUTCMinutes(),
      );
      const diff = scheduleDateTime.getTime() - now.getTime();
      if (diff < MIN_BOOKING_ANTICIPATION_MS) {
        throw new BadRequestException(
          'Debe haber al menos 2 horas de anticipación para agendar una cita',
        );
      }
    }

    // ── Sede del doctor ──
    const doctorClinicId =
      await this.timezoneResolver.resolveClinicIdByDoctorId(doctorId);

    if (jwtClinicId && doctorClinicId !== jwtClinicId) {
      throw new ForbiddenException(
        'No puede agendar citas para un doctor de otra sede',
      );
    }

    // ── Feriado ──
    const isHoliday = await this.holidayRepository.isHoliday(
      scheduleDate,
      doctorClinicId ?? undefined,
    );
    if (isHoliday) {
      throw new BadRequestException(
        'No se puede agendar una cita en un día feriado',
      );
    }

    // ── Bloqueo de horario del doctor ──
    const isBlocked = await this.scheduleBlockRepository.isBlocked(
      doctorId,
      scheduleDate,
      slotStart,
      slotEnd,
    );
    if (isBlocked) {
      throw new ConflictException(
        'El doctor tiene un bloqueo de horario que cubre la fecha/hora seleccionada',
      );
    }

    return doctorClinicId;
  }
}
