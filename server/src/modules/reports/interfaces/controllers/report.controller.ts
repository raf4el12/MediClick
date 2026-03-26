import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth, CurrentClinic } from '../../../../shared/decorators/index.js';
import {
  WeeklyAppointmentReportDto,
  RevenueReportDto,
  TopDoctorReportDto,
  AppointmentsSummaryReportDto,
  ScheduleOccupancyReportDto,
} from '../../application/dto/report-response.dto.js';
import { MonthYearQueryDto } from '../../application/dto/report-query.dto.js';
import { GetWeeklyAppointmentsUseCase } from '../../application/use-cases/get-weekly-appointments.use-case.js';
import { GetRevenueUseCase } from '../../application/use-cases/get-revenue.use-case.js';
import { GetTopDoctorsUseCase } from '../../application/use-cases/get-top-doctors.use-case.js';
import { GetAppointmentsSummaryUseCase } from '../../application/use-cases/get-appointments-summary.use-case.js';
import { GetScheduleOccupancyUseCase } from '../../application/use-cases/get-schedule-occupancy.use-case.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly getWeeklyAppointmentsUseCase: GetWeeklyAppointmentsUseCase,
    private readonly getRevenueUseCase: GetRevenueUseCase,
    private readonly getTopDoctorsUseCase: GetTopDoctorsUseCase,
    private readonly getAppointmentsSummaryUseCase: GetAppointmentsSummaryUseCase,
    private readonly getScheduleOccupancyUseCase: GetScheduleOccupancyUseCase,
  ) {}

  @Get('appointments-weekly')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Citas agrupadas por día de la semana actual' })
  @ApiResponse({ status: 200, type: [WeeklyAppointmentReportDto] })
  async getWeeklyAppointments(
    @CurrentClinic() clinicId: number | null,
  ): Promise<WeeklyAppointmentReportDto[]> {
    return this.getWeeklyAppointmentsUseCase.execute(clinicId);
  }

  @Get('revenue')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reporte de ingresos (proyectados vs reales)' })
  @ApiResponse({ status: 200, type: RevenueReportDto })
  async getRevenue(
    @Query() query: MonthYearQueryDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<RevenueReportDto> {
    return this.getRevenueUseCase.execute(query.month, query.year, clinicId);
  }

  @Get('top-doctors')
  @Auth(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Ranking de doctores con más citas completadas en el mes',
  })
  @ApiResponse({ status: 200, type: [TopDoctorReportDto] })
  async getTopDoctors(
    @Query() query: MonthYearQueryDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<TopDoctorReportDto[]> {
    return this.getTopDoctorsUseCase.execute(
      query.month,
      query.year,
      query.limit ?? 10,
      clinicId,
    );
  }

  @Get('appointments-summary')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resumen de citas del mes (por estado y por día)' })
  @ApiResponse({ status: 200, type: AppointmentsSummaryReportDto })
  async getAppointmentsSummary(
    @Query() query: MonthYearQueryDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<AppointmentsSummaryReportDto> {
    return this.getAppointmentsSummaryUseCase.execute(
      query.month,
      query.year,
      clinicId,
    );
  }

  @Get('schedule-occupancy')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ocupación de horarios del mes' })
  @ApiResponse({ status: 200, type: ScheduleOccupancyReportDto })
  async getScheduleOccupancy(
    @Query() query: MonthYearQueryDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<ScheduleOccupancyReportDto> {
    return this.getScheduleOccupancyUseCase.execute(
      query.month,
      query.year,
      clinicId,
    );
  }
}
