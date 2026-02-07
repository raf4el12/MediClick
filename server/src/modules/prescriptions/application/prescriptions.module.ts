import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PrismaPrescriptionRepository } from '../infrastructure/persistence/prisma-prescription.repository.js';
import { CreatePrescriptionUseCase } from './use-cases/create-prescription.use-case.js';
import { FindPrescriptionByAppointmentUseCase } from './use-cases/find-prescription-by-appointment.use-case.js';
import { PrescriptionController } from '../interfaces/controllers/prescription.controller.js';

@Module({
  imports: [AppointmentsModule, DoctorsModule],
  controllers: [PrescriptionController],
  providers: [
    {
      provide: 'IPrescriptionRepository',
      useClass: PrismaPrescriptionRepository,
    },
    CreatePrescriptionUseCase,
    FindPrescriptionByAppointmentUseCase,
  ],
})
export class PrescriptionsModule {}
