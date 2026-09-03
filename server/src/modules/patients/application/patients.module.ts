import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../../auth/application/auth.module.js';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PrismaPatientRepository } from '../infrastructure/persistence/prisma-patient.repository.js';
import { CreatePatientUseCase } from './use-cases/create-patient.use-case.js';
import { FindAllPatientsUseCase } from './use-cases/find-all-patients.use-case.js';
import { GetPatientHistoryUseCase } from './use-cases/get-patient-history.use-case.js';
import { UpdatePatientUseCase } from './use-cases/update-patient.use-case.js';
import { DeletePatientUseCase } from './use-cases/delete-patient.use-case.js';
import { GetPatientRiskProfileUseCase } from './use-cases/get-patient-risk-profile.use-case.js';
import { PatientRiskService } from '../domain/services/patient-risk.service.js';
import { PatientRiskAccessPolicy } from '../../../shared/access/patient-risk-access.policy.js';
import { PatientController } from '../interfaces/controllers/patient.controller.js';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => DoctorsModule)],
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
    GetPatientRiskProfileUseCase,
    PatientRiskService,
    PatientRiskAccessPolicy,
  ],
  exports: [
    'IPatientRepository',
    PatientRiskService,
    GetPatientRiskProfileUseCase,
    PatientRiskAccessPolicy,
  ],
})
export class PatientsModule {}
