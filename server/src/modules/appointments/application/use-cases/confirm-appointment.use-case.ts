import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import type { AppointmentConfirmedEvent } from '../../../../shared/mail/events/mail-events.interface.js';
import {
  DEFAULT_TIMEZONE,
  DEFAULT_CLINIC_NAME,
} from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class ConfirmAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: number): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException(
        `No se puede confirmar. Estado actual: ${appointment.status}. Solo se permite desde PENDING`,
      );
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.CONFIRMED,
      updatedAt: new Date(),
    });

    if (updated.patient.profile.userId) {
      const event: AppointmentConfirmedEvent = {
        appointmentId: updated.id,
        patientEmail: updated.patient.profile.email,
        patientName: `${updated.patient.profile.name} ${updated.patient.profile.lastName}`,
        patientUserId: updated.patient.profile.userId,
        doctorName: `${updated.schedule.doctor.profile.name} ${updated.schedule.doctor.profile.lastName}`,
        specialty: updated.schedule.specialty.name,
        clinicName: updated.schedule.doctor.clinic?.name ?? DEFAULT_CLINIC_NAME,
        clinicTimezone:
          updated.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
        scheduleDate: updated.schedule.scheduleDate,
        startTime: updated.startTime,
        endTime: updated.endTime,
      };
      this.eventEmitter.emit('appointment.confirmed', event);
    }

    return this.toResponse(updated);
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
