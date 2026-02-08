import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class CheckInAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(id: number): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `No se puede hacer check-in. Estado actual: ${appointment.status}. Solo se permite desde PENDING o CONFIRMED`,
      );
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.IN_PROGRESS,
      updatedAt: new Date(),
    });

    return this.toResponse(updated);
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
