import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { toPatientAppointmentResponse } from '../mappers/patient-appointment.mapper.js';

/**
 * Detalle de una cita para el personal (comprobante, enlaces directos): misma
 * forma que `GET /appointments/my/:id`. Personal de su sede, el médico de la
 * cita o un actor global; el paciente usa `my/:id`.
 */
@Injectable()
export class GetAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly accessPolicy: AppointmentAccessPolicy,
  ) {}

  async execute(
    actor: AuthenticatedUser,
    appointmentId: number,
  ): Promise<AppointmentResponseDto> {
    if (actor.roleName === 'PATIENT') {
      throw new NotFoundException('Cita no encontrada');
    }

    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    this.accessPolicy.authorize(actor, 'READ', {
      id: appointment.id,
      clinicId:
        appointment.schedule.doctor.clinic?.id ?? appointment.clinicId ?? null,
      patientUserId: appointment.patient.profile.userId,
      doctorUserId: appointment.schedule.doctor.profile.userId ?? null,
    });

    return toPatientAppointmentResponse(appointment);
  }
}
