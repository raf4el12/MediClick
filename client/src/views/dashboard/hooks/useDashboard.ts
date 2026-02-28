'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
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

const now = new Date();
const today = now.toISOString().split('T')[0]!;
const month = now.getMonth() + 1;
const year = now.getFullYear();

export function useDashboard(): DashboardData {
  const results = useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'appointments-today', today],
        queryFn: () =>
          appointmentsService.findAllPaginated(
            { currentPage: 1, pageSize: 1 },
            { dateFrom: today, dateTo: today },
          ),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['dashboard', 'patients-count'],
        queryFn: () =>
          patientsService.findAllPaginated({ currentPage: 1, pageSize: 1 }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dashboard', 'doctors-count'],
        queryFn: () =>
          doctorsService.findAllPaginated({ currentPage: 1, pageSize: 1 }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dashboard', 'specialties-count'],
        queryFn: () =>
          specialtiesService.findAllPaginated({ currentPage: 1, pageSize: 1 }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dashboard', 'summary', month, year],
        queryFn: () => reportsService.getAppointmentsSummary(month, year),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dashboard', 'occupancy', month, year],
        queryFn: () => reportsService.getScheduleOccupancy(month, year),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [
    appointmentsResult,
    patientsResult,
    doctorsResult,
    specialtiesResult,
    summaryResult,
    occupancyResult,
  ] = results;

  const loading = results.some((r) => r.isLoading);

  const stats = useMemo<DashboardStats>(
    () => ({
      todayAppointments: appointmentsResult?.data?.totalRows ?? 0,
      totalPatients: patientsResult?.data?.totalRows ?? 0,
      totalDoctors: doctorsResult?.data?.totalRows ?? 0,
      totalSpecialties: specialtiesResult?.data?.totalRows ?? 0,
    }),
    [
      appointmentsResult?.data?.totalRows,
      patientsResult?.data?.totalRows,
      doctorsResult?.data?.totalRows,
      specialtiesResult?.data?.totalRows,
    ],
  );

  const summary: AppointmentsSummary | null = summaryResult?.data ?? null;
  const occupancy: ScheduleOccupancy | null = occupancyResult?.data ?? null;

  return { stats, summary, occupancy, loading };
}
