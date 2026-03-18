import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PatientsModule } from '../../patients/application/patients.module.js';
import { PrismaPrescriptionRepository } from '../infrastructure/persistence/prisma-prescription.repository.js';
import { PrescriptionPdfService } from '../domain/services/prescription-pdf.service.js';
import { CreatePrescriptionUseCase } from './use-cases/create-prescription.use-case.js';
import { FindPrescriptionByAppointmentUseCase } from './use-cases/find-prescription-by-appointment.use-case.js';
import { FindMyPrescriptionUseCase } from './use-cases/find-my-prescription.use-case.js';
import { GeneratePrescriptionPdfUseCase } from './use-cases/generate-prescription-pdf.use-case.js';
import { GenerateMyPrescriptionPdfUseCase } from './use-cases/generate-my-prescription-pdf.use-case.js';
import { PrescriptionController } from '../interfaces/controllers/prescription.controller.js';

@Module({
  imports: [AppointmentsModule, DoctorsModule, PatientsModule],
  controllers: [PrescriptionController],
  providers: [
    {
      provide: 'IPrescriptionRepository',
      useClass: PrismaPrescriptionRepository,
    },
    PrescriptionPdfService,
    CreatePrescriptionUseCase,
    FindPrescriptionByAppointmentUseCase,
    FindMyPrescriptionUseCase,
    GeneratePrescriptionPdfUseCase,
    GenerateMyPrescriptionPdfUseCase,
  ],
})
export class PrescriptionsModule {}
