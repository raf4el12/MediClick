import {
  WeeklyAppointmentReport,
  RevenueReport,
  TopDoctorReport,
  AppointmentsSummaryReport,
  ScheduleOccupancyReport,
} from '../interfaces/report-data.interface.js';

export interface IReportRepository {
  getWeeklyAppointments(): Promise<WeeklyAppointmentReport[]>;
  getRevenue(month: number, year: number): Promise<RevenueReport>;
  getTopDoctors(
    month: number,
    year: number,
    limit: number,
  ): Promise<TopDoctorReport[]>;
  getAppointmentsSummary(
    month: number,
    year: number,
  ): Promise<AppointmentsSummaryReport>;
  getScheduleOccupancy(
    month: number,
    year: number,
  ): Promise<ScheduleOccupancyReport>;
}
