export interface WeeklyAppointmentReport {
  dayOfWeek: string;
  date: string;
  count: number;
}

export interface RevenueReport {
  projectedRevenue: number;
  actualRevenue: number;
  currency: string;
}

export interface TopDoctorReport {
  doctorId: number;
  doctorName: string;
  specialties: string[];
  completedAppointments: number;
}
