import {
  WeeklyAppointmentReport,
  RevenueReport,
  TopDoctorReport,
} from '../interfaces/report-data.interface.js';

export interface IReportRepository {
  getWeeklyAppointments(): Promise<WeeklyAppointmentReport[]>;
  getRevenue(month: number, year: number): Promise<RevenueReport>;
  getTopDoctors(
    month: number,
    year: number,
    limit: number,
  ): Promise<TopDoctorReport[]>;
}
