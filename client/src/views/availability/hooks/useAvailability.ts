'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectAvailabilityData,
  selectAvailabilityDoctors,
  selectAvailabilityLoading,
  selectAvailabilityError,
} from '@/redux-store/slices/availability';
import {
  fetchAvailabilityThunk,
  fetchAvailabilityDoctorsThunk,
  createBulkAvailabilityThunk,
  deleteAvailabilityThunk,
} from '@/redux-store/thunks/availability.thunks';
import {
  type DayOfWeek,
  type WeeklySchedule,
  AvailabilityType,
  ORDERED_DAYS,
  createDefaultSchedule,
} from '../types';

export function useAvailability() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectAvailabilityData);
  const doctors = useAppSelector(selectAvailabilityDoctors);
  const loading = useAppSelector(selectAvailabilityLoading);
  const error = useAppSelector(selectAvailabilityError);

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | ''>('');
  const [schedule, setSchedule] = useState<WeeklySchedule>(createDefaultSchedule());
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load doctors on mount
  useEffect(() => {
    void dispatch(fetchAvailabilityDoctorsThunk());
  }, [dispatch]);

  // Load existing availability when doctor changes
  useEffect(() => {
    if (selectedDoctorId) {
      void dispatch(
        fetchAvailabilityThunk({
          pagination: { pageSize: 100, currentPage: 1 },
          doctorId: selectedDoctorId,
        }),
      );
    }
  }, [dispatch, selectedDoctorId]);

  // Build weekly schedule from existing availability data
  useEffect(() => {
    const newSchedule = createDefaultSchedule();

    if (selectedDoctorId && data.rows.length > 0) {
      for (const avail of data.rows) {
        if (!avail.isAvailable) continue;
        const day = avail.dayOfWeek as DayOfWeek;
        if (!newSchedule[day]) continue;

        newSchedule[day].enabled = true;
        newSchedule[day].slots.push({
          start: avail.timeFrom,
          end: avail.timeTo,
        });

        // Use the first availability's dates as range
        if (!dateRange.startDate && avail.startDate) {
          setDateRange({
            startDate: avail.startDate.split('T')[0] ?? '',
            endDate: avail.endDate.split('T')[0] ?? '',
          });
        }
      }
    }

    setSchedule(newSchedule);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rows, selectedDoctorId]);

  // Doctor index map for O(1) lookup
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  const selectedDoctor = useMemo(
    () => doctorMap.get(selectedDoctorId as number) ?? null,
    [doctorMap, selectedDoctorId],
  );

  const doctorSpecialties: Array<{ id: number; name: string }> = useMemo(
    () => selectedDoctor?.specialties ?? [],
    [selectedDoctor],
  );

  // KPIs
  const activeDays = useMemo(
    () => ORDERED_DAYS.filter((day) => schedule[day].enabled).length,
    [schedule],
  );

  const weeklyHours = useMemo(() => {
    let total = 0;

    for (const day of ORDERED_DAYS) {
      if (!schedule[day].enabled) continue;

      for (const slot of schedule[day].slots) {
        const startParts = slot.start.split(':').map(Number);
        const endParts = slot.end.split(':').map(Number);
        const sh = startParts[0] ?? 0;
        const sm = startParts[1] ?? 0;
        const eh = endParts[0] ?? 0;
        const em = endParts[1] ?? 0;
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) total += diff;
      }
    }

    return Math.round((total / 60) * 10) / 10;
  }, [schedule]);

  // Schedule manipulation
  const toggleDay = (day: DayOfWeek) => {
    setSchedule((prev) => {
      const wasEnabled = prev[day].enabled;

      return {
        ...prev,
        [day]: {
          enabled: !wasEnabled,
          slots: !wasEnabled && prev[day].slots.length === 0
            ? [{ start: '08:00', end: '14:00' }]
            : prev[day].slots,
        },
      };
    });
  };

  const addSlot = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: '14:00', end: '18:00' }],
      },
    }));
  };

  const removeSlot = (day: DayOfWeek, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
  };

  const updateSlot = (
    day: DayOfWeek,
    index: number,
    field: 'start' | 'end',
    value: string,
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot,
        ),
      },
    }));
  };

  // Save all
  const handleSave = useCallback(async () => {
    if (!selectedDoctorId || !selectedSpecialtyId || !dateRange.startDate || !dateRange.endDate) return;

    setSaving(true);
    setSaveSuccess(false);

    // Delete existing availability for this doctor
    if (data.rows.length > 0) {
      await Promise.all(
        data.rows.map((a) => dispatch(deleteAvailabilityThunk(a.id))),
      );
    }

    // Build payloads from schedule
    const payloads: Parameters<typeof createBulkAvailabilityThunk>[0] = [];

    for (const day of ORDERED_DAYS) {
      if (!schedule[day].enabled) continue;

      for (const slot of schedule[day].slots) {
        payloads.push({
          doctorId: selectedDoctorId as number,
          specialtyId: selectedSpecialtyId as number,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dayOfWeek: day,
          timeFrom: slot.start,
          timeTo: slot.end,
          type: AvailabilityType.REGULAR,
        });
      }
    }

    if (payloads.length > 0) {
      const result = await dispatch(createBulkAvailabilityThunk(payloads));

      if (createBulkAvailabilityThunk.fulfilled.match(result)) {
        setSaveSuccess(true);
      }
    } else {
      setSaveSuccess(true);
    }

    // Reload availability in parallel with success state
    void dispatch(
      fetchAvailabilityThunk({
        pagination: { pageSize: 100, currentPage: 1 },
        doctorId: selectedDoctorId as number,
      }),
    );

    setSaving(false);
  }, [dispatch, selectedDoctorId, selectedSpecialtyId, dateRange, schedule, data.rows]);

  return {
    doctors,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedDoctor,
    selectedSpecialtyId,
    setSelectedSpecialtyId,
    doctorSpecialties,
    schedule,
    dateRange,
    setDateRange,
    loading,
    error,
    saving,
    saveSuccess,
    setSaveSuccess,
    activeDays,
    weeklyHours,
    toggleDay,
    addSlot,
    removeSlot,
    updateSlot,
    handleSave,
  };
}
