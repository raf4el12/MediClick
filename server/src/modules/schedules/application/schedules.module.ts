import { Module } from '@nestjs/common';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { AvailabilityModule } from '../../availability/application/availability.module.js';
import { PrismaScheduleRepository } from '../infrastructure/persistence/prisma-schedule.repository.js';
import { GenerateSchedulesUseCase } from './use-cases/generate-schedules.use-case.js';
import { FindAllSchedulesUseCase } from './use-cases/find-all-schedules.use-case.js';
import { ScheduleController } from '../interfaces/controllers/schedule.controller.js';

@Module({
  imports: [DoctorsModule, AvailabilityModule],
  controllers: [ScheduleController],
  providers: [
    {
      provide: 'IScheduleRepository',
      useClass: PrismaScheduleRepository,
    },
    GenerateSchedulesUseCase,
    FindAllSchedulesUseCase,
  ],
  exports: ['IScheduleRepository'],
})
export class SchedulesModule {}
