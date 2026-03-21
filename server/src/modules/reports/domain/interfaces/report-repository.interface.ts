import {
  WeeklyAppointmentReport,
  RevenueReport,
  TopDoctorReport,
  AppointmentsSummaryReport,
  ScheduleOccupancyReport,
} from '../interfaces/report-data.interface.js';

export interface IReportRepository {
  getWeeklyAppointments(
    clinicId?: number | null,
  ): Promise<WeeklyAppointmentReport[]>;
  getRevenue(
    month: number,
    year: number,
    clinicId?: number | null,
  ): Promise<RevenueReport>;
  getTopDoctors(
    month: number,
    year: number,
    limit: number,
    clinicId?: number | null,
  ): Promise<TopDoctorReport[]>;
  getAppointmentsSummary(
    month: number,
    year: number,
    clinicId?: number | null,
  ): Promise<AppointmentsSummaryReport>;
  getScheduleOccupancy(
    month: number,
    year: number,
    clinicId?: number | null,
  ): Promise<ScheduleOccupancyReport>;
}
