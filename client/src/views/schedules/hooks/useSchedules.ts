'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectSchedulesData,
  selectSchedulesDoctors,
  selectSchedulesLoading,
  selectSchedulesGenerating,
  selectSchedulesGenerateResult,
  selectSchedulesError,
  clearGenerateResult,
} from '@/redux-store/slices/schedules';
import {
  fetchSchedulesThunk,
  fetchSchedulesDoctorsThunk,
  generateSchedulesThunk,
} from '@/redux-store/thunks/schedules.thunks';
import type { Schedule, GenerateSchedulesPayload } from '../types';
import { formatDateKey, getWeekStart, getWeekDays } from '../types';

export function useSchedules() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectSchedulesData);
  const doctors = useAppSelector(selectSchedulesDoctors);
  const loading = useAppSelector(selectSchedulesLoading);
  const generating = useAppSelector(selectSchedulesGenerating);
  const generateResult = useAppSelector(selectSchedulesGenerateResult);
  const error = useAppSelector(selectSchedulesError);

  // Week-based state
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | ''>('');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  // Selected day for "all doctors" mode
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Derive week days
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Load doctors on mount
  useEffect(() => {
    void dispatch(fetchSchedulesDoctorsThunk());
  }, [dispatch]);

  // Date range for current week
  const dateFrom = useMemo(() => formatDateKey(weekDays[0]!), [weekDays]);
  const dateTo = useMemo(() => formatDateKey(weekDays[6]!), [weekDays]);

  // Fetch schedules when filters/week change
  useEffect(() => {
    const filters: Record<string, string | number> = { dateFrom, dateTo };
    if (selectedDoctorId) filters.doctorId = selectedDoctorId;
    if (selectedSpecialtyId) filters.specialtyId = selectedSpecialtyId;

    void dispatch(
      fetchSchedulesThunk({
        pagination: { pageSize: 500, currentPage: 1 },
        filters,
      }),
    );
  }, [dispatch, dateFrom, dateTo, selectedDoctorId, selectedSpecialtyId]);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    for (const schedule of data.rows) {
      const dateKey = schedule.scheduleDate.split('T')[0] ?? schedule.scheduleDate;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(schedule);
    }
    return map;
  }, [data.rows]);

  // Navigation
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setWeekStart(getWeekStart(today));
    setSelectedDate(today);
  }, []);

  // Day navigation for "all doctors" mode
  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      // Also shift week if we go before weekStart
      const ws = getWeekStart(d);
      setWeekStart(ws);
      return d;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      const ws = getWeekStart(d);
      setWeekStart(ws);
      return d;
    });
  }, []);

  // Doctor index map for O(1) lookup
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  const selectedDoctor = useMemo(
    () => doctorMap.get(selectedDoctorId as number) ?? null,
    [doctorMap, selectedDoctorId],
  );

  const doctorSpecialties = useMemo(
    () => selectedDoctor?.specialties ?? [],
    [selectedDoctor],
  );

  // KPIs
  const totalSchedules = data.totalRows;
  const uniqueDoctors = useMemo(() => {
    const set = new Set(data.rows.map((s) => s.doctorId));
    return set.size;
  }, [data.rows]);
  const scheduledDays = useMemo(() => Object.keys(schedulesByDate).length, [schedulesByDate]);

  // Current month/year for the generate dialog (based on week start)
  const currentMonth = weekStart.getMonth();
  const currentYear = weekStart.getFullYear();

  // Generate
  const handleGenerate = useCallback(
    async (payload: GenerateSchedulesPayload) => {
      const result = await dispatch(generateSchedulesThunk(payload));

      if (generateSchedulesThunk.fulfilled.match(result)) {
        setGenerateSuccess(true);
        void dispatch(
          fetchSchedulesThunk({
            pagination: { pageSize: 500, currentPage: 1 },
            filters: {
              dateFrom,
              dateTo,
              ...(selectedDoctorId ? { doctorId: selectedDoctorId as number } : {}),
              ...(selectedSpecialtyId ? { specialtyId: selectedSpecialtyId as number } : {}),
            },
          }),
        );
      }
    },
    [dispatch, dateFrom, dateTo, selectedDoctorId, selectedSpecialtyId],
  );

  return {
    // Data
    doctors,
    schedulesByDate,
    loading,
    error,
    // Week
    weekStart,
    weekDays,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    // Day (all-doctors mode)
    selectedDate,
    setSelectedDate,
    goToPrevDay,
    goToNextDay,
    // Filters
    selectedDoctorId,
    setSelectedDoctorId,
    selectedSpecialtyId,
    setSelectedSpecialtyId,
    selectedDoctor,
    doctorSpecialties,
    // KPIs
    totalSchedules,
    uniqueDoctors,
    scheduledDays,
    // Generate
    currentMonth,
    currentYear,
    generating,
    generateResult,
    generateDialogOpen,
    setGenerateDialogOpen,
    generateSuccess,
    setGenerateSuccess,
    handleGenerate,
    clearGenerateResult: () => dispatch(clearGenerateResult()),
  };
}
