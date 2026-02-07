import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/application/auth.module.js';
import { PrismaPatientRepository } from '../infrastructure/persistence/prisma-patient.repository.js';
import { CreatePatientUseCase } from './use-cases/create-patient.use-case.js';
import { FindAllPatientsUseCase } from './use-cases/find-all-patients.use-case.js';
import { GetPatientHistoryUseCase } from './use-cases/get-patient-history.use-case.js';
import { UpdatePatientUseCase } from './use-cases/update-patient.use-case.js';
import { DeletePatientUseCase } from './use-cases/delete-patient.use-case.js';
import { PatientController } from '../interfaces/controllers/patient.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [PatientController],
  providers: [
    {
      provide: 'IPatientRepository',
      useClass: PrismaPatientRepository,
    },
    CreatePatientUseCase,
    FindAllPatientsUseCase,
    GetPatientHistoryUseCase,
    UpdatePatientUseCase,
    DeletePatientUseCase,
  ],
  exports: ['IPatientRepository'],
})
export class PatientsModule {}
