import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePatientAppointmentDto } from '../dto/create-patient-appointment.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { AppointmentSlotValidatorService } from '../services/appointment-slot-validator.service.js';
import {
  parseHHmm,
  dateToTimeString,
} from '../../../../shared/utils/date-time.utils.js';
import { getAppointmentPaymentTimeoutMs } from '../../../../shared/utils/payment-timeout.util.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class CreatePatientAppointmentUseCase {
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
    userId: number,
    dto: CreatePatientAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    // Resolver paciente desde el userId autenticado
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException(
        'No se encontró un perfil de paciente asociado a tu cuenta',
      );
    }

    const schedule = await this.scheduleRepository.findById(dto.scheduleId);
    if (!schedule) {
      throw new BadRequestException('El horario especificado no existe');
    }

    const specialtyPrice = schedule.specialty.price;
    if (!specialtyPrice || specialtyPrice <= 0) {
      throw new BadRequestException(
        'La especialidad seleccionada no tiene precio configurado; no puede reservarse online',
      );
    }

    // ── Parsear horas del slot ──
    const slotStart = parseHHmm(dto.startTime);
    const slotEnd = parseHHmm(dto.endTime);

    // Precondiciones del slot (rango, duración/grilla, fecha pasada, 2h,
    // feriado, bloqueo). Sin jwtClinicId: el paciente puede reservar en
    // cualquier sede.
    const clinicId = await this.slotValidator.validate({
      doctorId: schedule.doctorId,
      scheduleDate: new Date(schedule.scheduleDate),
      schedTimeFrom: new Date(schedule.timeFrom),
      schedTimeTo: new Date(schedule.timeTo),
      slotStart,
      slotEnd,
      durationMinutes: schedule.specialty.duration,
      bufferMinutes: schedule.specialty.bufferMinutes,
    });

    // Verifica overlap y crea la cita en una sola transacción serializable.
    // El monto y el deadline de pago se escriben dentro de la misma transacción
    // para que la reserva sea atómica y no exista ventana de carrera (TOCTOU)
    // entre el chequeo de superposición y el create.
    const pendingUntil = new Date(
      Date.now() + getAppointmentPaymentTimeoutMs(),
    );
    const appointment = await this.appointmentRepository.createWithOverlapCheck(
      {
        patientId: patient.id,
        scheduleId: dto.scheduleId,
        startTime: slotStart,
        endTime: slotEnd,
        reason: dto.reason,
        clinicId: clinicId ?? null,
        amount: specialtyPrice,
        pendingUntil,
      },
      slotStart,
      slotEnd,
    );

    return {
      id: appointment.id,
      patientId: appointment.patientId,
      scheduleId: appointment.scheduleId,
      startTime: dateToTimeString(appointment.startTime),
      endTime: dateToTimeString(appointment.endTime),
      reason: appointment.reason,
      notes: appointment.notes,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      amount: appointment.amount,
      cancelReason: appointment.cancelReason,
      cancellationFee: appointment.cancellationFee,
      isOverbook: appointment.isOverbook,
      pendingUntil: appointment.pendingUntil ?? pendingUntil,
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.profile.name,
        lastName: appointment.patient.profile.lastName,
        email: appointment.patient.profile.email,
      },
      schedule: {
        id: appointment.schedule.id,
        scheduleDate: appointment.schedule.scheduleDate,
        timeFrom: dateToTimeString(appointment.schedule.timeFrom),
        timeTo: dateToTimeString(appointment.schedule.timeTo),
        doctor: {
          id: appointment.schedule.doctor.id,
          name: appointment.schedule.doctor.profile.name,
          lastName: appointment.schedule.doctor.profile.lastName,
        },
        specialty: appointment.schedule.specialty,
      },
      timezone:
        appointment.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
      hasPrescription: appointment.hasPrescription,
      notesCount: appointment.notesCount,
      createdAt: appointment.createdAt,
    };
  }
}
