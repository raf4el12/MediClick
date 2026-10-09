import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { MyAppointmentsSummaryResponseDto } from '../dto/my-appointments-summary-response.dto.js';
import { toPatientAppointmentResponse } from '../mappers/patient-appointment.mapper.js';
import {
  upcomingAppointments,
  upcomingFromDate,
} from '../services/patient-upcoming.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

@Injectable()
export class GetMyAppointmentsSummaryUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(userId: number): Promise<MyAppointmentsSummaryResponseDto> {
    // El paciente se resuelve por la sesión, nunca por un id de la petición.
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException(
        'No se encontró un perfil de paciente asociado a tu cuenta',
      );
    }

    const now = new Date();
    const source = await this.appointmentRepository.findPatientSummarySource(
      patient.id,
      upcomingFromDate(now),
    );

    const upcoming = upcomingAppointments(source.appointments, now);

    // Las que `createPaymentPreference` aceptaría ahora.
    const pendingWithDeadline = source.appointments.filter(
      (a) =>
        a.status === AppointmentStatus.PENDING &&
        a.paymentStatus === 'PENDING' &&
        !!a.pendingUntil &&
        a.pendingUntil > now,
    );
    const confirmedWithBalance = source.appointments.filter(
      (a) =>
        a.status === AppointmentStatus.CONFIRMED &&
        a.paymentStatus === 'PARTIAL',
    );
    const deadlines = pendingWithDeadline.map((a) => a.pendingUntil!.getTime());

    return {
      nextAppointment: upcoming[0]
        ? toPatientAppointmentResponse(upcoming[0])
        : null,
      upcomingCount: upcoming.length,
      awaitingPaymentCount:
        pendingWithDeadline.length + confirmedWithBalance.length,
      earliestPaymentDeadline: deadlines.length
        ? new Date(Math.min(...deadlines))
        : null,
      completedCount: source.completedCount,
      pendingReviewCount: source.pendingReviewCount,
    };
  }
}
