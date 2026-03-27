import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

@Injectable()
export class FindPrescriptionByAppointmentUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
    role?: string,
  ): Promise<PrescriptionResponseDto> {
    // Doctores solo pueden ver recetas de sus propias citas
    if (role === UserRole.DOCTOR) {
      const appointment =
        await this.appointmentRepository.findById(appointmentId);
      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      const doctorId =
        await this.doctorRepository.findDoctorIdByUserId(userId);
      if (appointment.schedule.doctor.id !== doctorId) {
        throw new ForbiddenException(
          'No tiene permiso para ver recetas de esta cita',
        );
      }
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
