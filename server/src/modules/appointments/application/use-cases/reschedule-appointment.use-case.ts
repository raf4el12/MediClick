import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { parseHHmm, dateToTimeString, toMinutesUTC } from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
  ) {}

  async execute(
    id: number,
    dto: RescheduleAppointmentDto,
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

    // Parsear y validar tiempos del nuevo slot
    const newStartTime = parseHHmm(dto.startTime);
    const newEndTime = parseHHmm(dto.endTime);

    if (newStartTime.getTime() >= newEndTime.getTime()) {
      throw new BadRequestException(
        'startTime debe ser anterior a endTime',
      );
    }

    // Validar que el slot cabe dentro del rango del nuevo schedule
    const schedTimeFrom = new Date(newSchedule.timeFrom);
    const schedTimeTo = new Date(newSchedule.timeTo);

    const schedFromMinutes = toMinutesUTC(schedTimeFrom);
    const schedToMinutes = toMinutesUTC(schedTimeTo);
    const slotStartMinutes = toMinutesUTC(newStartTime);
    const slotEndMinutes = toMinutesUTC(newEndTime);

    if (slotStartMinutes < schedFromMinutes || slotEndMinutes > schedToMinutes) {
      throw new BadRequestException(
        `El slot ${dto.startTime}-${dto.endTime} está fuera del rango del turno ` +
          `${dateToTimeString(schedTimeFrom)}-${dateToTimeString(schedTimeTo)}`,
      );
    }

    // Verificar superposición con citas existentes en el nuevo schedule
    const hasOverlap =
      await this.appointmentRepository.hasOverlappingAppointment(
        dto.newScheduleId,
        newStartTime,
        newEndTime,
        id, // excluir la cita actual
      );
    if (hasOverlap) {
      throw new ConflictException(
        'Ya existe una cita que se superpone con el horario seleccionado',
      );
    }

    const updated = await this.appointmentRepository.update(id, {
      scheduleId: dto.newScheduleId,
      startTime: newStartTime,
      endTime: newEndTime,
      status: AppointmentStatus.PENDING,
      updatedAt: new Date(),
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
      timezone: a.schedule.doctor.clinic?.timezone ?? 'America/Lima',
      createdAt: a.createdAt,
    };
  }
}
