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

  async execute(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new BadRequestException('El paciente especificado no existe');
    }

    const schedule = await this.scheduleRepository.findById(dto.scheduleId);
    if (!schedule) {
      throw new BadRequestException('El horario especificado no existe');
    }

    const hasAppointment =
      await this.appointmentRepository.existsAppointmentForSchedule(
        dto.scheduleId,
      );
    if (hasAppointment) {
      throw new ConflictException('El horario ya tiene una cita asignada');
    }

    const appointment = await this.appointmentRepository.create({
      patientId: dto.patientId,
      scheduleId: dto.scheduleId,
      reason: dto.reason,
    });

    return this.toResponse(appointment);
  }

  private toResponse(a: any): AppointmentResponseDto {
    return {
      id: a.id,
      patientId: a.patientId,
      scheduleId: a.scheduleId,
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
