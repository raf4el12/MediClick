import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class GetDoctorDailyAppointmentsUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(userId: number): Promise<AppointmentResponseDto[]> {
    const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new BadRequestException(
        'No se encontró un doctor asociado a este usuario',
      );
    }

    const today = new Date();
    const appointments = await this.appointmentRepository.findByDoctorAndDate(
      doctorId,
      today,
    );

    return appointments.map((a) => ({
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
    }));
  }
}
