import { Module } from '@nestjs/common';
import { PrismaClinicRepository } from '../infrastructure/persistence/prisma-clinic.repository.js';
import { TimezoneResolverService } from '../../../shared/services/timezone-resolver.service.js';
import { CreateClinicUseCase } from './use-cases/create-clinic.use-case.js';
import { FindAllClinicsUseCase } from './use-cases/find-all-clinics.use-case.js';
import { FindClinicByIdUseCase } from './use-cases/find-clinic-by-id.use-case.js';
import { UpdateClinicUseCase } from './use-cases/update-clinic.use-case.js';
import { DeleteClinicUseCase } from './use-cases/delete-clinic.use-case.js';
import { ClinicController } from '../interfaces/controllers/clinic.controller.js';

@Module({
  controllers: [ClinicController],
  providers: [
    {
      provide: 'IClinicRepository',
      useClass: PrismaClinicRepository,
    },
    TimezoneResolverService,
    CreateClinicUseCase,
    FindAllClinicsUseCase,
    FindClinicByIdUseCase,
    UpdateClinicUseCase,
    DeleteClinicUseCase,
  ],
  exports: ['IClinicRepository', TimezoneResolverService],
})
export class ClinicsModule {}
