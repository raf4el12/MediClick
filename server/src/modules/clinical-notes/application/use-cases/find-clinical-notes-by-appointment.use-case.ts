import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClinicalNoteResponseDto } from '../dto/clinical-note-response.dto.js';
import type { IClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

@Injectable()
export class FindClinicalNotesByAppointmentUseCase {
  constructor(
    @Inject('IClinicalNoteRepository')
    private readonly clinicalNoteRepository: IClinicalNoteRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
    role?: string,
  ): Promise<ClinicalNoteResponseDto[]> {
    // Doctores solo pueden ver notas de sus propias citas
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
          'No tiene permiso para ver notas de esta cita',
        );
      }
    }

    const notes =
      await this.clinicalNoteRepository.findByAppointmentId(appointmentId);

    return notes.map((n) => ({
      id: n.id,
      appointmentId: n.appointmentId,
      summary: n.summary,
      diagnosis: n.diagnosis,
      plan: n.plan,
      patient: {
        id: n.appointment.patient.id,
        name: n.appointment.patient.profile.name,
        lastName: n.appointment.patient.profile.lastName,
      },
      scheduleDate: n.appointment.schedule.scheduleDate,
      createdAt: n.createdAt,
    }));
  }
}
