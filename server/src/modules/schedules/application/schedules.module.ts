import { Module } from '@nestjs/common';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { AvailabilityModule } from '../../availability/application/availability.module.js';
import { SpecialtiesModule } from '../../specialties/application/specialties.module.js';
import { PrismaScheduleRepository } from '../infrastructure/persistence/prisma-schedule.repository.js';
import { GenerateSchedulesUseCase } from './use-cases/generate-schedules.use-case.js';
import { FindAllSchedulesUseCase } from './use-cases/find-all-schedules.use-case.js';
import { GetAvailableTimeSlotsUseCase } from './use-cases/get-available-time-slots.use-case.js';
import { ScheduleController } from '../interfaces/controllers/schedule.controller.js';

@Module({
  imports: [DoctorsModule, AvailabilityModule, SpecialtiesModule],
  controllers: [ScheduleController],
  providers: [
    {
      provide: 'IScheduleRepository',
      useClass: PrismaScheduleRepository,
    },
    GenerateSchedulesUseCase,
    FindAllSchedulesUseCase,
    GetAvailableTimeSlotsUseCase,
  ],
  exports: ['IScheduleRepository'],
})
export class SchedulesModule {}
