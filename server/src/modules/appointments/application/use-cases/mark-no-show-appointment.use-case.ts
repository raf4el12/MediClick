import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  dateToTimeString,
  nowInTimezone,
} from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';

@Injectable()
export class MarkNoShowAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly timezoneResolver: TimezoneResolverService,
    private readonly appointmentAccessPolicy: AppointmentAccessPolicy,
  ) {}

  async execute(
    id: number,
    actor: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    this.appointmentAccessPolicy.authorize(actor, 'MARK_NO_SHOW', {
      id: appointment.id,
      clinicId: appointment.schedule.doctor.clinic?.id ?? appointment.clinicId,
      patientUserId: appointment.patient.profile.userId,
      doctorUserId: appointment.schedule.doctor.profile.userId ?? null,
    });

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        `No se puede marcar inasistencia. Estado actual: ${appointment.status}. Solo se permite desde CONFIRMED`,
      );
    }

    // La inasistencia solo es determinable una vez pasada la hora de inicio
    // (zona horaria de la sede del doctor)
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
    if (now.getTime() < appointmentDateTime.getTime()) {
      throw new BadRequestException(
        'No se puede marcar inasistencia antes de la hora de inicio de la cita',
      );
    }

    let penaltyFee: number | undefined;
    if (appointment.paymentStatus === 'PAID') {
      if (appointment.depositAmount) {
        penaltyFee = Number(appointment.depositAmount);
      } else if (appointment.amount) {
        const penaltyPercentage =
          (
            appointment.schedule.doctor.clinic as {
              noShowPenaltyPercentage?: number;
            } | null
          )?.noShowPenaltyPercentage ?? 100;
        penaltyFee = Math.round(
          (Number(appointment.amount) * Number(penaltyPercentage)) / 100,
        );
      }
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.NO_SHOW,
      ...(penaltyFee !== undefined && { cancellationFee: penaltyFee }),
      updatedAt: new Date(),
    });

    return this.toResponse(updated);
  }

  private toResponse(a: AppointmentWithRelations): AppointmentResponseDto {
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
      depositAmount: a.depositAmount ?? null,
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
