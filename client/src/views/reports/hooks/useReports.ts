'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportsService } from '@/services/reports.service';
import type {
  RevenueReport,
  TopDoctor,
  AppointmentsSummary,
  ScheduleOccupancy,
  ReportFilters,
} from '../types';

const now = new Date();

export function useReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [summary, setSummary] = useState<AppointmentsSummary | null>(null);
  const [occupancy, setOccupancy] = useState<ScheduleOccupancy | null>(null);

  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [loadingTopDoctors, setLoadingTopDoctors] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  const fetchAll = useCallback(async (month: number, year: number) => {
    setLoadingRevenue(true);
    setLoadingTopDoctors(true);
    setLoadingSummary(true);
    setLoadingOccupancy(true);

    const [revenueResult, topDoctorsResult, summaryResult, occupancyResult] =
      await Promise.allSettled([
        reportsService.getRevenue(month, year),
        reportsService.getTopDoctors(month, year, 5),
        reportsService.getAppointmentsSummary(month, year),
        reportsService.getScheduleOccupancy(month, year),
      ]);

    if (revenueResult.status === 'fulfilled') setRevenue(revenueResult.value);
    else setRevenue(null);
    setLoadingRevenue(false);

    if (topDoctorsResult.status === 'fulfilled')
      setTopDoctors(topDoctorsResult.value);
    else setTopDoctors([]);
    setLoadingTopDoctors(false);

    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    else setSummary(null);
    setLoadingSummary(false);

    if (occupancyResult.status === 'fulfilled')
      setOccupancy(occupancyResult.value);
    else setOccupancy(null);
    setLoadingOccupancy(false);
  }, []);

  useEffect(() => {
    void fetchAll(filters.month, filters.year);
  }, [filters, fetchAll]);

  return {
    filters,
    setFilters,
    revenue,
    topDoctors,
    summary,
    occupancy,
    loadingRevenue,
    loadingTopDoctors,
    loadingSummary,
    loadingOccupancy,
  };
}
