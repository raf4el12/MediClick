import { Module } from '@nestjs/common';
import { PrismaReportRepository } from '../infrastructure/persistence/prisma-report.repository.js';
import { GetWeeklyAppointmentsUseCase } from './use-cases/get-weekly-appointments.use-case.js';
import { GetRevenueUseCase } from './use-cases/get-revenue.use-case.js';
import { GetTopDoctorsUseCase } from './use-cases/get-top-doctors.use-case.js';
import { ReportController } from '../interfaces/controllers/report.controller.js';

@Module({
  controllers: [ReportController],
  providers: [
    {
      provide: 'IReportRepository',
      useClass: PrismaReportRepository,
    },
    GetWeeklyAppointmentsUseCase,
    GetRevenueUseCase,
    GetTopDoctorsUseCase,
  ],
})
export class ReportsModule {}
