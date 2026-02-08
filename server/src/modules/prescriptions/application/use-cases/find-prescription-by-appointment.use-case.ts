import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

@Injectable()
export class FindPrescriptionByAppointmentUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
  ): Promise<PrescriptionResponseDto> {
    const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new BadRequestException(
        'No se encontró un doctor asociado a este usuario',
      );
    }

    const appointmentDoctorId =
      await this.prescriptionRepository.findAppointmentDoctorId(appointmentId);
    if (appointmentDoctorId !== null && appointmentDoctorId !== doctorId) {
      throw new ForbiddenException(
        'No tiene permiso para ver recetas de esta cita',
      );
    }

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
