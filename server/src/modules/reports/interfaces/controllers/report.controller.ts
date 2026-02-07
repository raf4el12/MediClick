import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import {
  WeeklyAppointmentReportDto,
  RevenueReportDto,
  TopDoctorReportDto,
} from '../../application/dto/report-response.dto.js';
import { GetWeeklyAppointmentsUseCase } from '../../application/use-cases/get-weekly-appointments.use-case.js';
import { GetRevenueUseCase } from '../../application/use-cases/get-revenue.use-case.js';
import { GetTopDoctorsUseCase } from '../../application/use-cases/get-top-doctors.use-case.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly getWeeklyAppointmentsUseCase: GetWeeklyAppointmentsUseCase,
    private readonly getRevenueUseCase: GetRevenueUseCase,
    private readonly getTopDoctorsUseCase: GetTopDoctorsUseCase,
  ) {}

  @Get('appointments-weekly')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Citas agrupadas por día de la semana actual' })
  @ApiResponse({ status: 200, type: [WeeklyAppointmentReportDto] })
  async getWeeklyAppointments(): Promise<WeeklyAppointmentReportDto[]> {
    return this.getWeeklyAppointmentsUseCase.execute();
  }

  @Get('revenue')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reporte de ingresos (proyectados vs reales)' })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 2 })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2026 })
  @ApiResponse({ status: 200, type: RevenueReportDto })
  async getRevenue(
    @Query('month') month: string,
    @Query('year') year: string,
  ): Promise<RevenueReportDto> {
    return this.getRevenueUseCase.execute(
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Get('top-doctors')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ranking de doctores con más citas completadas en el mes' })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 2 })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2026 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, type: [TopDoctorReportDto] })
  async getTopDoctors(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('limit') limit?: string,
  ): Promise<TopDoctorReportDto[]> {
    return this.getTopDoctorsUseCase.execute(
      parseInt(month, 10),
      parseInt(year, 10),
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
