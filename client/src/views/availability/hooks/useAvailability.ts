'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { availabilityService } from '@/services/availability.service';
import { doctorsService } from '@/services/doctors.service';
import { rulesToWeek, weekToEntries, type WeekRules } from '../model/weekRules';

/** Médicos que recepción puede elegir. */
export function useDoctorOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['availability', 'doctors'],
    queryFn: async () => (await doctorsService.findAllPaginated({ pageSize: 100, currentPage: 1 })).rows,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Reglas semanales de un médico en una especialidad, y su reemplazo con `bulk-save`. */
export function useWeekRules(doctorId: number | null, specialtyId: number | null) {
  const queryClient = useQueryClient();

  const rules = useQuery({
    queryKey: ['availability', 'rules', doctorId],
    queryFn: async () => (await availabilityService.findAllPaginated({ pageSize: 100, currentPage: 1 }, doctorId!)).rows,
    enabled: doctorId !== null,
  });

  const week = useMemo(
    () => (rules.data && specialtyId !== null ? rulesToWeek(rules.data, specialtyId) : null),
    [rules.data, specialtyId],
  );

  const save = useMutation({
    mutationFn: (next: WeekRules) => availabilityService.bulkSave({ doctorId: doctorId!, specialtyId: specialtyId!, entries: weekToEntries(next) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability', 'rules', doctorId] });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  return { week, isLoading: rules.isLoading, error: rules.error, save };
}
