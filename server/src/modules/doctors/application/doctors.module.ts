import { Module } from '@nestjs/common';
import { SpecialtiesModule } from '../../specialties/application/specialties.module.js';
import { PrismaDoctorRepository } from '../infrastructure/persistence/prisma-doctor.repository.js';
import { OnboardDoctorUseCase } from './use-cases/onboard-doctor.use-case.js';
import { FindAllDoctorsUseCase } from './use-cases/find-all-doctors.use-case.js';
import { FindDoctorByIdUseCase } from './use-cases/find-doctor-by-id.use-case.js';
import { DoctorController } from '../interfaces/controllers/doctor.controller.js';

@Module({
  imports: [SpecialtiesModule],
  controllers: [DoctorController],
  providers: [
    {
      provide: 'IDoctorRepository',
      useClass: PrismaDoctorRepository,
    },
    OnboardDoctorUseCase,
    FindAllDoctorsUseCase,
    FindDoctorByIdUseCase,
  ],
  exports: ['IDoctorRepository'],
})
export class DoctorsModule {}
