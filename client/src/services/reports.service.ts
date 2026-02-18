import { api } from '@/libs/axios';
import type {
  WeeklyAppointment,
  RevenueReport,
  TopDoctor,
  AppointmentsSummary,
  ScheduleOccupancy,
} from '@/views/reports/types';

export const reportsService = {
  getWeeklyAppointments: async (): Promise<WeeklyAppointment[]> => {
    const response = await api.get<WeeklyAppointment[]>(
      '/reports/appointments-weekly',
    );
    return response.data;
  },

  getRevenue: async (month: number, year: number): Promise<RevenueReport> => {
    const response = await api.get<RevenueReport>('/reports/revenue', {
      params: { month, year },
    });
    return response.data;
  },

  getTopDoctors: async (
    month: number,
    year: number,
    limit: number = 5,
  ): Promise<TopDoctor[]> => {
    const response = await api.get<TopDoctor[]>('/reports/top-doctors', {
      params: { month, year, limit },
    });
    return response.data;
  },

  getAppointmentsSummary: async (
    month: number,
    year: number,
  ): Promise<AppointmentsSummary> => {
    const response = await api.get<AppointmentsSummary>(
      '/reports/appointments-summary',
      { params: { month, year } },
    );
    return response.data;
  },

  getScheduleOccupancy: async (
    month: number,
    year: number,
  ): Promise<ScheduleOccupancy> => {
    const response = await api.get<ScheduleOccupancy>(
      '/reports/schedule-occupancy',
      { params: { month, year } },
    );
    return response.data;
  },
};
