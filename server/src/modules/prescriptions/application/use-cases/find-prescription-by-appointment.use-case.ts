import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';

@Injectable()
export class FindPrescriptionByAppointmentUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
  ): Promise<PrescriptionResponseDto> {
    const prescription =
      await this.prescriptionRepository.findByAppointmentId(appointmentId);
    if (!prescription) {
      throw new NotFoundException('No se encontró receta para esta cita');
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
