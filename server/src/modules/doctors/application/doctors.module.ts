import { Module, forwardRef } from '@nestjs/common';
import { SpecialtiesModule } from '../../specialties/application/specialties.module.js';
import { AuthModule } from '../../auth/application/auth.module.js';
import { PrismaDoctorRepository } from '../infrastructure/persistence/prisma-doctor.repository.js';
import { OnboardDoctorUseCase } from './use-cases/onboard-doctor.use-case.js';
import { FindAllDoctorsUseCase } from './use-cases/find-all-doctors.use-case.js';
import { FindDoctorByIdUseCase } from './use-cases/find-doctor-by-id.use-case.js';
import { UpdateDoctorUseCase } from './use-cases/update-doctor.use-case.js';
import { DeleteDoctorUseCase } from './use-cases/delete-doctor.use-case.js';
import { DoctorController } from '../interfaces/controllers/doctor.controller.js';

@Module({
  imports: [SpecialtiesModule, forwardRef(() => AuthModule)],
  controllers: [DoctorController],
  providers: [
    {
      provide: 'IDoctorRepository',
      useClass: PrismaDoctorRepository,
    },
    OnboardDoctorUseCase,
    FindAllDoctorsUseCase,
    FindDoctorByIdUseCase,
    UpdateDoctorUseCase,
    DeleteDoctorUseCase,
  ],
  exports: ['IDoctorRepository'],
})
export class DoctorsModule { }

