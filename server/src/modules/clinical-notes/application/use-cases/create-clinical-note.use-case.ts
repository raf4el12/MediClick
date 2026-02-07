import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateClinicalNoteDto } from '../dto/create-clinical-note.dto.js';
import { ClinicalNoteResponseDto } from '../dto/clinical-note-response.dto.js';
import type { IClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

@Injectable()
export class CreateClinicalNoteUseCase {
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
    dto: CreateClinicalNoteDto,
  ): Promise<ClinicalNoteResponseDto> {
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Verificar que el doctor autenticado es dueño de esta cita
    const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new BadRequestException('No se encontró un doctor asociado a este usuario');
    }

    if (appointment.schedule.doctor.id !== doctorId) {
      throw new ForbiddenException('No tiene permiso para crear notas en esta cita');
    }

    const note = await this.clinicalNoteRepository.create({
      appointmentId: dto.appointmentId,
      summary: dto.summary,
      diagnosis: dto.diagnosis,
      plan: dto.plan,
    });

    return this.toResponse(note);
  }

  private toResponse(n: any): ClinicalNoteResponseDto {
    return {
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
    };
  }
}
