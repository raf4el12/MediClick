import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { CreateAppointmentDto } from '../dto/create-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { AppointmentSlotValidatorService } from '../services/appointment-slot-validator.service.js';
import {
  parseHHmm,
  dateToTimeString,
} from '../../../../shared/utils/date-time.utils.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    private readonly slotValidator: AppointmentSlotValidatorService,
  ) {}

  async execute(
    dto: CreateAppointmentDto,
    jwtClinicId?: number | null,
  ): Promise<AppointmentResponseDto> {
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

    // Precondiciones del slot (rango, fecha pasada, 2h, sede, feriado, bloqueo).
    // Retorna el clinicId del doctor para asociarlo a la cita.
    const doctorClinicId = await this.slotValidator.validate({
      doctorId: schedule.doctorId,
      scheduleDate: new Date(schedule.scheduleDate),
      schedTimeFrom: new Date(schedule.timeFrom),
      schedTimeTo: new Date(schedule.timeTo),
      slotStart,
      slotEnd,
      jwtClinicId,
    });

    // ── Verificar colisión y crear cita atómicamente (previene double-booking) ──
    const appointment =
      await this.appointmentRepository.createWithOverlapCheck(
        {
          patientId: dto.patientId,
          scheduleId: dto.scheduleId,
          startTime: slotStart,
          endTime: slotEnd,
          reason: dto.reason,
          clinicId: doctorClinicId ?? null,
        },
        slotStart,
        slotEnd,
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
