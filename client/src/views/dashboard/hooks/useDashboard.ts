'use client';

import { useState, useEffect, useCallback } from 'react';
import { patientsService } from '@/services/patients.service';
import { doctorsService } from '@/services/doctors.service';
import { specialtiesService } from '@/services/specialties.service';
import { appointmentsService } from '@/services/appointments.service';
import { reportsService } from '@/services/reports.service';
import type { AppointmentsSummary, ScheduleOccupancy } from '@/views/reports/types';

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  totalDoctors: number;
  totalSpecialties: number;
}

interface DashboardData {
  stats: DashboardStats;
  summary: AppointmentsSummary | null;
  occupancy: ScheduleOccupancy | null;
  loading: boolean;
}

export function useDashboard(): DashboardData {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalSpecialties: 0,
  });
  const [summary, setSummary] = useState<AppointmentsSummary | null>(null);
  const [occupancy, setOccupancy] = useState<ScheduleOccupancy | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      appointmentsResult,
      patientsResult,
      doctorsResult,
      specialtiesResult,
      summaryResult,
      occupancyResult,
    ] = await Promise.allSettled([
      appointmentsService.findAllPaginated(
        { currentPage: 1, pageSize: 1 },
        { dateFrom: today, dateTo: today },
      ),
      patientsService.findAllPaginated({ currentPage: 1, pageSize: 1 }),
      doctorsService.findAllPaginated({ currentPage: 1, pageSize: 1 }),
      specialtiesService.findAllPaginated({ currentPage: 1, pageSize: 1 }),
      reportsService.getAppointmentsSummary(month, year),
      reportsService.getScheduleOccupancy(month, year),
    ]);

    setStats({
      todayAppointments:
        appointmentsResult.status === 'fulfilled'
          ? appointmentsResult.value.totalRows
          : 0,
      totalPatients:
        patientsResult.status === 'fulfilled'
          ? patientsResult.value.totalRows
          : 0,
      totalDoctors:
        doctorsResult.status === 'fulfilled'
          ? doctorsResult.value.totalRows
          : 0,
      totalSpecialties:
        specialtiesResult.status === 'fulfilled'
          ? specialtiesResult.value.totalRows
          : 0,
    });

    setSummary(
      summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    );
    setOccupancy(
      occupancyResult.status === 'fulfilled' ? occupancyResult.value : null,
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { stats, summary, occupancy, loading };
}
