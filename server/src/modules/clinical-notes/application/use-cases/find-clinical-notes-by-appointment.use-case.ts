import { Injectable, Inject } from '@nestjs/common';
import { ClinicalNoteResponseDto } from '../dto/clinical-note-response.dto.js';
import type { IClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';

@Injectable()
export class FindClinicalNotesByAppointmentUseCase {
  constructor(
    @Inject('IClinicalNoteRepository')
    private readonly clinicalNoteRepository: IClinicalNoteRepository,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
  ): Promise<ClinicalNoteResponseDto[]> {
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
