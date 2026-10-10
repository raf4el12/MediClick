'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaService } from '@/services/agenda.service';
import { appointmentsService } from '@/services/appointments.service';
import { toAgendaEvents, type AgendaEventOptions } from '../model/toAgendaEvents';
import type { AgendaScope, DateRange, SlotTarget } from '../types';

/** Agenda de un médico o una sede en un rango; `range` nulo mientras el calendario no informa el suyo. */
interface UseAgendaOptions extends AgendaEventOptions {
  refetchInterval?: number;
}

export function useAgenda(scope: AgendaScope, range: DateRange | null, options: UseAgendaOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['agenda', scope, range],
    queryFn: () => agendaService.get(scope, range!),
    enabled: range !== null,
    placeholderData: (previous) => previous,
    refetchInterval: options.refetchInterval,
  });

  const { statuses, showFreeCupos } = options;
  const events = useMemo(
    () => (query.data ? toAgendaEvents(query.data, { statuses, showFreeCupos }) : []),
    [query.data, statuses, showFreeCupos],
  );

  const mutation = useMutation({
    mutationFn: ({ appointmentId, target }: { appointmentId: number; target: SlotTarget }) =>
      appointmentsService.reschedule(appointmentId, {
        newScheduleId: target.scheduleId,
        startTime: target.startTime,
        endTime: target.endTime,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'daily-appointments'] });
    },
  });

  return {
    snapshot: query.data,
    events,
    isLoading: query.isLoading,
    error: query.error,
    reschedule: (appointmentId: number, target: SlotTarget) => mutation.mutateAsync({ appointmentId, target }),
  };
}
