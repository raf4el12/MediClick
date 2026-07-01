import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateOverbookAppointmentDto } from '../dto/create-overbook-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import {
  dateToTimeString,
  normalizeToTimeOnly,
  nowInTimezone,
  todayStartInTimezone,
  scheduleDateToLocalDay,
  MIN_BOOKING_ANTICIPATION_MS,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

/**
 * Crea una cita de sobrecupo al final del último slot del doctor en una fecha.
 *
 * Reglas:
 * - Solo ADMIN o DOCTOR pueden crear sobrecupos
 * - Máximo configurable por doctor/día (maxOverbookPerDay)
 * - Se agenda después del bloque normal: max(fin del turno, fin de la última cita)
 * - Valida feriado, bloqueo del doctor y anticipación de 2h (si es hoy)
 * - Se marca explícitamente como isOverbook = true
 */
@Injectable()
export class CreateOverbookAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
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
    dto: CreateOverbookAppointmentDto,
    jwtClinicId?: number | null,
  ): Promise<AppointmentResponseDto> {
    // 1. Validar paciente
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new BadRequestException('El paciente especificado no existe');
    }

    // 2. Validar doctor y obtener límite de sobrecupo
    const doctor = await this.doctorRepository.findById(dto.doctorId);
    if (!doctor) {
      throw new BadRequestException('El doctor especificado no existe');
    }

    // Staff can only create overbooks for doctors of their own clinic
    if (jwtClinicId && doctor.clinicId !== jwtClinicId) {
      throw new ForbiddenException(
        'No puede crear sobrecupos para un doctor de otra sede',
      );
    }

    // 3. Validar especialidad y obtener duración
    const specialty = await this.specialtyRepository.findById(dto.specialtyId);
    if (!specialty) {
      throw new BadRequestException('La especialidad especificada no existe');
    }
    if (!specialty.duration || specialty.duration <= 0) {
      throw new BadRequestException(
        'La especialidad no tiene una duración configurada',
      );
    }

    // 4. Parsear fecha
    const appointmentDate = new Date(dto.date);
    if (isNaN(appointmentDate.getTime())) {
      throw new BadRequestException('La fecha proporcionada no es válida');
    }

    // No permitir fechas pasadas (zona horaria de la sede del doctor)
    const tz = await this.timezoneResolver.resolveByDoctorId(dto.doctorId);
    const todayStart = todayStartInTimezone(tz);
    const dateOnly = scheduleDateToLocalDay(appointmentDate);
    if (dateOnly < todayStart) {
      throw new BadRequestException(
        'No se puede crear un sobrecupo en una fecha pasada',
      );
    }

    const isHoliday = await this.holidayRepository.isHoliday(
      appointmentDate,
      doctor.clinicId ?? undefined,
    );
    if (isHoliday) {
      throw new BadRequestException(
        'No se puede crear un sobrecupo en un día feriado',
      );
    }

    // 5. Obtener los schedules del doctor para esa fecha y especialidad
    const schedules = await this.scheduleRepository.findByDoctorAndDate(
      dto.doctorId,
      appointmentDate,
      dto.specialtyId,
    );

    if (schedules.length === 0) {
      throw new BadRequestException(
        'No hay horarios del doctor para esa fecha y especialidad',
      );
    }

    // 7. Encontrar el último schedule (ordenados por timeFrom ASC)
    const lastSchedule = schedules[schedules.length - 1];

    // 8. Buscar la última cita activa de ese schedule para calcular el inicio del sobrecupo
    const existingAppointments =
      await this.appointmentRepository.findByDoctorAndDate(
        dto.doctorId,
        appointmentDate,
      );

    // Filtrar solo citas activas del mismo schedule
    const activeAppointmentsInSchedule = existingAppointments.filter(
      (a) =>
        a.scheduleId === lastSchedule.id &&
        !['CANCELLED', 'NO_SHOW'].includes(a.status),
    );

    // El sobrecupo siempre va después del bloque normal: max(fin del turno,
    // fin de la última cita activa). Si arrancara al final de la última cita,
    // pisaría los slots regulares aún libres al final del turno.
    const overbookStartTime = activeAppointmentsInSchedule.reduce(
      (max, a) => {
        const end = normalizeToTimeOnly(a.endTime);
        return end.getTime() > max.getTime() ? end : max;
      },
      normalizeToTimeOnly(new Date(lastSchedule.timeTo)),
    );

    // 9. Calcular endTime basado en la duración de la especialidad
    const durationMs = specialty.duration * 60 * 1000;
    const overbookEndTime = new Date(overbookStartTime.getTime() + durationMs);

    // Anticipación mínima si el sobrecupo es para hoy (igual que en create)
    if (dateOnly.getTime() === todayStart.getTime()) {
      const now = nowInTimezone(tz);
      const slotDateTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        overbookStartTime.getUTCHours(),
        overbookStartTime.getUTCMinutes(),
      );
      if (
        slotDateTime.getTime() - now.getTime() <
        MIN_BOOKING_ANTICIPATION_MS
      ) {
        throw new BadRequestException(
          'Debe haber al menos 2 horas de anticipación para crear un sobrecupo',
        );
      }
    }

    // Bloqueo de horario del doctor sobre el rango del sobrecupo
    const isBlocked = await this.scheduleBlockRepository.isBlocked(
      dto.doctorId,
      appointmentDate,
      overbookStartTime,
      overbookEndTime,
    );
    if (isBlocked) {
      throw new ConflictException(
        'El doctor tiene un bloqueo de horario que cubre la fecha/hora del sobrecupo',
      );
    }

    // 10. Verificar límite y crear sobrecupo atómicamente (previene exceder maxOverbookPerDay)
    const appointment = await this.appointmentRepository.createOverbookAtomic(
      {
        patientId: dto.patientId,
        scheduleId: lastSchedule.id,
        startTime: overbookStartTime,
        endTime: overbookEndTime,
        reason: dto.reason,
        isOverbook: true,
        clinicId: doctor.clinicId ?? null,
      },
      dto.doctorId,
      appointmentDate,
      doctor.maxOverbookPerDay,
    );

    return this.toResponse(appointment);
  }

  private toResponse(a: any): AppointmentResponseDto {
    return {
      id: a.id,
      patientId: a.patientId,
      scheduleId: a.scheduleId,
      startTime: dateToTimeString(a.startTime),
      endTime: dateToTimeString(a.endTime),
      reason: a.reason,
      notes: a.notes,
      status: a.status,
      paymentStatus: a.paymentStatus,
      amount: a.amount,
      cancelReason: a.cancelReason,
      cancellationFee: a.cancellationFee,
      isOverbook: a.isOverbook,
      pendingUntil: a.pendingUntil ?? null,
      patient: {
        id: a.patient.id,
        name: a.patient.profile.name,
        lastName: a.patient.profile.lastName,
        email: a.patient.profile.email,
      },
      schedule: {
        id: a.schedule.id,
        scheduleDate: a.schedule.scheduleDate,
        timeFrom: dateToTimeString(a.schedule.timeFrom),
        timeTo: dateToTimeString(a.schedule.timeTo),
        doctor: {
          id: a.schedule.doctor.id,
          name: a.schedule.doctor.profile.name,
          lastName: a.schedule.doctor.profile.lastName,
        },
        specialty: a.schedule.specialty,
      },
      timezone: a.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
      hasPrescription: a.hasPrescription,
      notesCount: a.notesCount,
      createdAt: a.createdAt,
    };
  }
}
