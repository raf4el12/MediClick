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

/**
 * Convierte una cadena HH:mm al objeto Date de referencia (base 1970-01-01).
 */
function parseHHmm(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
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

    const schedFromMinutes =
      schedTimeFrom.getHours() * 60 + schedTimeFrom.getMinutes();
    const schedToMinutes =
      schedTimeTo.getHours() * 60 + schedTimeTo.getMinutes();
    const slotStartMinutes =
      slotStart.getHours() * 60 + slotStart.getMinutes();
    const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

    if (slotStartMinutes < schedFromMinutes || slotEndMinutes > schedToMinutes) {
      throw new BadRequestException(
        `El slot ${dto.startTime}-${dto.endTime} está fuera del rango del turno ` +
          `${dateToTimeString(schedTimeFrom)}-${dateToTimeString(schedTimeTo)}`,
      );
    }

    // ── Validación de fecha/hora (zona horaria Perú UTC-5) ──
    const nowPeru = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
    );
    const scheduleDate = new Date(schedule.scheduleDate);
    const todayStart = new Date(
      nowPeru.getFullYear(),
      nowPeru.getMonth(),
      nowPeru.getDate(),
    );
    const scheduleDayStart = new Date(
      scheduleDate.getFullYear(),
      scheduleDate.getMonth(),
      scheduleDate.getDate(),
    );

    // No permitir agendar en fechas pasadas
    if (scheduleDayStart < todayStart) {
      throw new BadRequestException(
        'No se puede agendar una cita en una fecha pasada',
      );
    }

    // Si es hoy, validar hora con buffer de 2 horas
    if (scheduleDayStart.getTime() === todayStart.getTime()) {
      const scheduleDateTime = new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth(),
        scheduleDate.getDate(),
        slotStart.getHours(),
        slotStart.getMinutes(),
      );
      const diff = scheduleDateTime.getTime() - nowPeru.getTime();
      if (diff < CreateAppointmentUseCase.MIN_BUFFER_MS) {
        throw new BadRequestException(
          'Debe haber al menos 2 horas de anticipación para agendar una cita',
        );
      }
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
