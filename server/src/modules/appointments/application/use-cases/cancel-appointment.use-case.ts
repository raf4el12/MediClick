import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
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
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { AppointmentCancellationService } from '../services/appointment-cancellation.service.js';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly timezoneResolver: TimezoneResolverService,
    private readonly appointmentCancellationService: AppointmentCancellationService,
    private readonly appointmentAccessPolicy: AppointmentAccessPolicy,
  ) {}

  async execute(
    id: number,
    dto: CancelAppointmentDto,
    actor: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    this.appointmentAccessPolicy.authorize(actor, 'CANCEL', {
      id: appointment.id,
      clinicId: appointment.schedule.doctor.clinic?.id ?? appointment.clinicId,
      patientUserId: appointment.patient.profile.userId,
      doctorUserId: appointment.schedule.doctor.profile.userId ?? null,
    });

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

    // Buscar la última transacción una sola vez: el fee solo aplica si hay un
    // pago PAID que cobrar, y los flags de refund/fee se anclan en esa transacción.
    const tx = await this.transactionRepository.findLatestByAppointmentId(id);
    const isPaid = tx?.status === 'PAID';

    let cancellationFee: number | undefined;

    // Penalización: paciente que cancela tarde (<24h) una cita pagada.
    if (
      actor.roleName === String(UserRole.PATIENT) &&
      hoursUntilAppointment < MIN_CANCELLATION_HOURS_PATIENT &&
      isPaid
    ) {
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

    const updated = await this.appointmentCancellationService.cancel({
      appointmentId: id,
      reason: dto.reason ?? null,
      cancelledBy: actor.roleName,
      ...(cancellationFee !== undefined && { cancellationFee }),
    });

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
