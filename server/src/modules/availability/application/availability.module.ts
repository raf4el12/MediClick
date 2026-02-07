import { Module } from '@nestjs/common';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PrismaAvailabilityRepository } from '../infrastructure/persistence/prisma-availability.repository.js';
import { CreateAvailabilityUseCase } from './use-cases/create-availability.use-case.js';
import { FindAllAvailabilityUseCase } from './use-cases/find-all-availability.use-case.js';
import { UpdateAvailabilityUseCase } from './use-cases/update-availability.use-case.js';
import { DeleteAvailabilityUseCase } from './use-cases/delete-availability.use-case.js';
import { AvailabilityController } from '../interfaces/controllers/availability.controller.js';

@Module({
  imports: [DoctorsModule],
  controllers: [AvailabilityController],
  providers: [
    {
      provide: 'IAvailabilityRepository',
      useClass: PrismaAvailabilityRepository,
    },
    CreateAvailabilityUseCase,
    FindAllAvailabilityUseCase,
    UpdateAvailabilityUseCase,
    DeleteAvailabilityUseCase,
  ],
  exports: ['IAvailabilityRepository'],
})
export class AvailabilityModule {}
