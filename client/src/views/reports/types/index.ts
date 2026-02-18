export interface WeeklyAppointment {
  dayOfWeek: string;
  date: string;
  count: number;
}

export interface RevenueReport {
  projectedRevenue: number;
  actualRevenue: number;
  currency: string;
}

export interface TopDoctor {
  doctorId: number;
  doctorName: string;
  specialties: string[];
  completedAppointments: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface AppointmentsSummary {
  total: number;
  byStatus: Record<string, number>;
  daily: DailyCount[];
}

export interface ScheduleOccupancy {
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  occupancyRate: number;
}

export interface ReportFilters {
  month: number;
  year: number;
}
