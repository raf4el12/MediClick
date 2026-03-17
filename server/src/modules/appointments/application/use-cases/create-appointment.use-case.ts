import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateAppointmentDto } from '../dto/create-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import {
  parseHHmm,
  dateToTimeString,
  toMinutesUTC,
  nowPeru,
  todayStartPeru,
  scheduleDateToLocalDay,
} from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  /** Buffer mínimo en milisegundos (2 horas) */
  private static readonly MIN_BUFFER_MS = 2 * 60 * 60 * 1000;

  async execute(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new BadRequestException('El paciente especificado no existe');
    }

    const schedule = await this.scheduleRepository.findById(dto.scheduleId);
    if (!schedule) {
      throw new BadRequestException('El horario especificado no existe');
    }

    // ── Parsear horas del slot ──
    const slotStart = parseHHmm(dto.startTime);
    const slotEnd = parseHHmm(dto.endTime);

    if (slotStart.getTime() >= slotEnd.getTime()) {
      throw new BadRequestException(
        'startTime debe ser anterior a endTime',
      );
    }

    // ── Validar que el slot cabe dentro del rango del schedule ──
    const schedTimeFrom = new Date(schedule.timeFrom);
    const schedTimeTo = new Date(schedule.timeTo);

    const schedFromMinutes = toMinutesUTC(schedTimeFrom);
    const schedToMinutes = toMinutesUTC(schedTimeTo);
    const slotStartMinutes = toMinutesUTC(slotStart);
    const slotEndMinutes = toMinutesUTC(slotEnd);

    if (slotStartMinutes < schedFromMinutes || slotEndMinutes > schedToMinutes) {
      throw new BadRequestException(
        `El slot ${dto.startTime}-${dto.endTime} está fuera del rango del turno ` +
          `${dateToTimeString(schedTimeFrom)}-${dateToTimeString(schedTimeTo)}`,
      );
    }

    // ── Validación de fecha/hora (zona horaria Perú UTC-5) ──
    const now = nowPeru();
    const scheduleDate = new Date(schedule.scheduleDate);
    const todayStart = todayStartPeru();
    const scheduleDayStart = scheduleDateToLocalDay(scheduleDate);

    // No permitir agendar en fechas pasadas
    if (scheduleDayStart < todayStart) {
      throw new BadRequestException(
        'No se puede agendar una cita en una fecha pasada',
      );
    }

    // Si es hoy, validar hora con buffer de 2 horas
    if (scheduleDayStart.getTime() === todayStart.getTime()) {
      const scheduleDateTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        slotStart.getUTCHours(),
        slotStart.getUTCMinutes(),
      );
      const diff = scheduleDateTime.getTime() - now.getTime();
      if (diff < CreateAppointmentUseCase.MIN_BUFFER_MS) {
        throw new BadRequestException(
          'Debe haber al menos 2 horas de anticipación para agendar una cita',
        );
      }
    }

    // ── Verificar si la fecha es feriado ──
    const isHoliday = await this.holidayRepository.isHoliday(scheduleDate);
    if (isHoliday) {
      throw new BadRequestException(
        'No se puede agendar una cita en un día feriado',
      );
    }

    // ── Verificar bloqueos de horario del doctor ──
    const isBlocked = await this.scheduleBlockRepository.isBlocked(
      schedule.doctorId,
      scheduleDate,
      slotStart,
      slotEnd,
    );
    if (isBlocked) {
      throw new ConflictException(
        'El doctor tiene un bloqueo de horario que cubre la fecha/hora seleccionada',
      );
    }

    // ── Verificar colisión con citas existentes en el mismo schedule ──
    const hasOverlap =
      await this.appointmentRepository.hasOverlappingAppointment(
        dto.scheduleId,
        slotStart,
        slotEnd,
      );
    if (hasOverlap) {
      throw new ConflictException(
        'Ya existe una cita que se superpone con el horario seleccionado',
      );
    }

    const appointment = await this.appointmentRepository.create({
      patientId: dto.patientId,
      scheduleId: dto.scheduleId,
      startTime: slotStart,
      endTime: slotEnd,
      reason: dto.reason,
    });

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
      createdAt: a.createdAt,
    };
  }
}
