import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';

@Injectable()
export class FindMyPrescriptionUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
  ): Promise<PrescriptionResponseDto> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new BadRequestException(
        'No se encontró un paciente asociado a este usuario',
      );
    }

    const prescription =
      await this.prescriptionRepository.findByAppointmentId(appointmentId);
    if (!prescription) {
      throw new NotFoundException('No se encontró receta para esta cita');
    }

    if (prescription.appointment.patient.id !== patient.id) {
      throw new ForbiddenException(
        'No tiene permiso para ver recetas de esta cita',
      );
    }

    return {
      id: prescription.id,
      appointmentId: prescription.appointmentId,
      instructions: prescription.instructions,
      validUntil: prescription.validUntil,
      items: prescription.items.map((i) => ({
        id: i.id,
        medication: i.medication,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        notes: i.notes,
      })),
      patient: {
        id: prescription.appointment.patient.id,
        name: prescription.appointment.patient.profile.name,
        lastName: prescription.appointment.patient.profile.lastName,
      },
      doctor: {
        id: prescription.appointment.schedule.doctor.id,
        name: prescription.appointment.schedule.doctor.profile.name,
        lastName: prescription.appointment.schedule.doctor.profile.lastName,
      },
      specialtyName: prescription.appointment.schedule.specialty.name,
      scheduleDate: prescription.appointment.schedule.scheduleDate,
      appointmentStatus: prescription.appointment.status,
      createdAt: prescription.createdAt,
    };
  }
}
