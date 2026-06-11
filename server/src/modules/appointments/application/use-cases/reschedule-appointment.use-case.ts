import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { AppointmentSlotValidatorService } from '../services/appointment-slot-validator.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  parseHHmm,
  dateToTimeString,
} from '../../../../shared/utils/date-time.utils.js';
import { getAppointmentPaymentTimeoutMs } from '../../../../shared/utils/payment-timeout.util.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    private readonly slotValidator: AppointmentSlotValidatorService,
  ) {}

  async execute(
    id: number,
    dto: RescheduleAppointmentDto,
    jwtClinicId?: number | null,
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
        `No se puede reagendar. Estado actual: ${appointment.status}`,
      );
    }

    // Validar nuevo schedule
    const newSchedule = await this.scheduleRepository.findById(
      dto.newScheduleId,
    );
    if (!newSchedule) {
      throw new BadRequestException('El nuevo horario especificado no existe');
    }

    // Parsear tiempos del nuevo slot
    const newStartTime = parseHHmm(dto.startTime);
    const newEndTime = parseHHmm(dto.endTime);

    // Mismas precondiciones que al crear: rango del turno, duración/grilla,
    // fecha pasada, anticipación de 2h, sede, feriado y bloqueo del doctor.
    await this.slotValidator.validate({
      doctorId: newSchedule.doctorId,
      scheduleDate: new Date(newSchedule.scheduleDate),
      schedTimeFrom: new Date(newSchedule.timeFrom),
      schedTimeTo: new Date(newSchedule.timeTo),
      slotStart: newStartTime,
      slotEnd: newEndTime,
      durationMinutes: newSchedule.specialty.duration,
      bufferMinutes: newSchedule.specialty.bufferMinutes,
      jwtClinicId,
    });

    // Una cita pagada conserva su estado (no vuelve a PENDING sin que nadie
    // la re-confirme) y no lleva deadline de pago.
    const isPaid = appointment.paymentStatus === 'PAID';

    // Solo se renueva el deadline si la cita ya tenía uno (reserva con pago
    // online). Las citas de staff tienen pendingUntil null y ponérselo aquí
    // haría que el cron de expiración las cancele.
    const pendingUntil =
      !isPaid && appointment.pendingUntil
        ? new Date(Date.now() + getAppointmentPaymentTimeoutMs())
        : null;

    // Verificar superposición y reagendar atómicamente (previene double-booking)
    const updated = await this.appointmentRepository.rescheduleWithOverlapCheck(
      id,
      {
        scheduleId: dto.newScheduleId,
        startTime: newStartTime,
        endTime: newEndTime,
        status: isPaid ? appointment.status : AppointmentStatus.PENDING,
        pendingUntil,
        reminderSent: false,
        updatedAt: new Date(),
      },
      dto.newScheduleId,
      newStartTime,
      newEndTime,
    );

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
