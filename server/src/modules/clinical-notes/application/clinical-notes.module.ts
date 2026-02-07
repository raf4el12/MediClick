import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PrismaClinicalNoteRepository } from '../infrastructure/persistence/prisma-clinical-note.repository.js';
import { CreateClinicalNoteUseCase } from './use-cases/create-clinical-note.use-case.js';
import { FindClinicalNotesByAppointmentUseCase } from './use-cases/find-clinical-notes-by-appointment.use-case.js';
import { ClinicalNoteController } from '../interfaces/controllers/clinical-note.controller.js';

@Module({
  imports: [AppointmentsModule, DoctorsModule],
  controllers: [ClinicalNoteController],
  providers: [
    {
      provide: 'IClinicalNoteRepository',
      useClass: PrismaClinicalNoteRepository,
    },
    CreateClinicalNoteUseCase,
    FindClinicalNotesByAppointmentUseCase,
  ],
})
export class ClinicalNotesModule {}
