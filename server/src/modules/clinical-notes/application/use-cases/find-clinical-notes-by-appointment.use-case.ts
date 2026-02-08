import {
  Injectable,
  Inject,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClinicalNoteResponseDto } from '../dto/clinical-note-response.dto.js';
import type { IClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

@Injectable()
export class FindClinicalNotesByAppointmentUseCase {
  constructor(
    @Inject('IClinicalNoteRepository')
    private readonly clinicalNoteRepository: IClinicalNoteRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
  ): Promise<ClinicalNoteResponseDto[]> {
    // Verificar que el doctor autenticado es dueño de esta cita
    const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new BadRequestException(
        'No se encontró un doctor asociado a este usuario',
      );
    }

    const appointmentDoctorId =
      await this.clinicalNoteRepository.findAppointmentDoctorId(appointmentId);
    if (appointmentDoctorId !== null && appointmentDoctorId !== doctorId) {
      throw new ForbiddenException(
        'No tiene permiso para ver notas de esta cita',
      );
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
