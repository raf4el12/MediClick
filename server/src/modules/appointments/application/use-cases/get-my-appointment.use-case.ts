import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { toPatientAppointmentResponse } from '../mappers/patient-appointment.mapper.js';

/** Detalle de una cita para su paciente (comprobante, receta, enlaces directos). */
@Injectable()
export class GetMyAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
  ): Promise<AppointmentResponseDto> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException(
        'No se encontró un perfil de paciente asociado a tu cuenta',
      );
    }

    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    // Una cita ajena responde igual que una inexistente: no se revela su existencia.
    if (!appointment || appointment.patientId !== patient.id) {
      throw new NotFoundException('Cita no encontrada');
    }

    return toPatientAppointmentResponse(appointment);
  }
}
