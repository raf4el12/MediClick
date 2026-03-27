import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import {
  MIN_CANCELLATION_HOURS_PATIENT,
  CANCELLATION_FEE_PERCENTAGE,
} from '../../domain/constants/cancellation-policy.constants.js';
import {
  dateToTimeString,
  nowInTimezone,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import type { AppointmentCancelledEvent } from '../../../../shared/mail/events/mail-events.interface.js';
import {
  DEFAULT_TIMEZONE,
  DEFAULT_CLINIC_NAME,
} from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    private readonly timezoneResolver: TimezoneResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: number,
    dto: CancelAppointmentDto,
    userRole: UserRole,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    const forbiddenStatuses = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
    ];
    if (forbiddenStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `No se puede cancelar. Estado actual: ${appointment.status}`,
      );
    }

    // Calcular horas restantes hasta la cita (zona horaria de la sede del doctor)
    const tz = await this.timezoneResolver.resolveByDoctorId(
      appointment.schedule.doctor.id,
    );
    const now = nowInTimezone(tz);
    const scheduleDate = new Date(appointment.schedule.scheduleDate);
    const appointmentDateTime = new Date(
      scheduleDate.getUTCFullYear(),
      scheduleDate.getUTCMonth(),
      scheduleDate.getUTCDate(),
      appointment.startTime.getUTCHours(),
      appointment.startTime.getUTCMinutes(),
    );
    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let cancellationFee: number | undefined;

    // Los pacientes deben cancelar con al menos 24h de anticipación
    if (userRole === UserRole.PATIENT) {
      if (hoursUntilAppointment < MIN_CANCELLATION_HOURS_PATIENT) {
        // Calcular penalización basada en el precio de la especialidad
        const specialty = await this.specialtyRepository.findById(
          appointment.schedule.specialty.id,
        );
        const specialtyPrice = specialty?.price ?? 0;

        if (specialtyPrice > 0) {
          cancellationFee = Math.round(
            (specialtyPrice * CANCELLATION_FEE_PERCENTAGE) / 100,
          );
        }
      }
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.CANCELLED,
      cancelReason: dto.reason,
      ...(cancellationFee !== undefined && { cancellationFee }),
      updatedAt: new Date(),
    });

    if (updated.patient.profile.userId) {
      const event: AppointmentCancelledEvent = {
        appointmentId: updated.id,
        patientEmail: updated.patient.profile.email,
        patientName: `${updated.patient.profile.name} ${updated.patient.profile.lastName}`,
        patientUserId: updated.patient.profile.userId,
        doctorName: `${updated.schedule.doctor.profile.name} ${updated.schedule.doctor.profile.lastName}`,
        clinicName: updated.schedule.doctor.clinic?.name ?? DEFAULT_CLINIC_NAME,
        clinicTimezone:
          updated.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
        scheduleDate: updated.schedule.scheduleDate,
        cancelReason: dto.reason ?? null,
      };
      this.eventEmitter.emit('appointment.cancelled', event);
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
