import { Module } from '@nestjs/common';
import { PrismaMedicalHistoryRepository } from '../infrastructure/persistence/prisma-medical-history.repository.js';
import { CreateMedicalHistoryUseCase } from './use-cases/create-medical-history.use-case.js';
import { FindMedicalHistoryByPatientUseCase } from './use-cases/find-medical-history-by-patient.use-case.js';
import { UpdateMedicalHistoryUseCase } from './use-cases/update-medical-history.use-case.js';
import { UpdateMedicalHistoryStatusUseCase } from './use-cases/update-medical-history-status.use-case.js';
import { DeleteMedicalHistoryUseCase } from './use-cases/delete-medical-history.use-case.js';
import { MedicalHistoryController } from '../interfaces/controllers/medical-history.controller.js';

@Module({
    controllers: [MedicalHistoryController],
    providers: [
        {
            provide: 'IMedicalHistoryRepository',
            useClass: PrismaMedicalHistoryRepository,
        },
        CreateMedicalHistoryUseCase,
        FindMedicalHistoryByPatientUseCase,
        UpdateMedicalHistoryUseCase,
        UpdateMedicalHistoryStatusUseCase,
        DeleteMedicalHistoryUseCase,
    ],
    exports: [FindMedicalHistoryByPatientUseCase],
})
export class MedicalHistoryModule { }
