'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { availabilityRestrictionsService } from '@/services/availability-restrictions.service';
import { scheduleBlocksService } from '@/services/schedule-blocks.service';
import type { CreateScheduleBlockPayload, UpdateScheduleBlockPayload } from '@/views/schedule-blocks/types';
import { ScheduleBlockType } from '@/views/schedule-blocks/types';
import type { BlockDraft, RestrictionImpactQuery } from '../types/restrictions';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Consulta de impacto de un borrador de bloqueo, o `null` si todavía no es válido. */
export function blockImpactQuery(doctorId: number, draft: BlockDraft): RestrictionImpactQuery | null {
  if (!DAY.test(draft.startDate) || !DAY.test(draft.endDate) || draft.endDate < draft.startDate) return null;
  if (draft.type === 'TIME_RANGE' && (!TIME.test(draft.timeFrom) || !TIME.test(draft.timeTo) || draft.timeFrom >= draft.timeTo)) return null;

  return {
    type: draft.type,
    doctorId,
    startDate: draft.startDate,
    endDate: draft.endDate,
    ...(draft.type === 'TIME_RANGE' ? { timeFrom: draft.timeFrom, timeTo: draft.timeTo } : {}),
    ...(draft.id ? { excludeRestrictionId: draft.id } : {}),
  };
}

/** Vista previa de impacto (UI-18). */
export function useRestrictionImpact(query: RestrictionImpactQuery | null) {
  return useQuery({
    queryKey: ['restriction-impact', query],
    queryFn: () => availabilityRestrictionsService.impact(query!),
    enabled: query !== null,
    placeholderData: (previous) => previous,
  });
}

const toPayload = (draft: BlockDraft) => ({
  type: draft.type as ScheduleBlockType,
  startDate: draft.startDate,
  endDate: draft.endDate,
  ...(draft.type === ScheduleBlockType.TIME_RANGE ? { timeFrom: draft.timeFrom, timeTo: draft.timeTo } : {}),
  reason: draft.reason.trim(),
});

/** Alta, edición y baja de bloqueos de agenda; cada cambio vuelve a pedir la agenda. */
export function useBlockMutations(doctorId: number) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['agenda'] });
    void queryClient.invalidateQueries({ queryKey: ['restriction-impact'] });
  };

  const save = useMutation({
    mutationFn: (draft: BlockDraft) =>
      draft.id
        ? scheduleBlocksService.update(draft.id, toPayload(draft) as UpdateScheduleBlockPayload)
        : scheduleBlocksService.create({ doctorId, ...toPayload(draft) } as CreateScheduleBlockPayload),
    onSuccess: refresh,
  });

  const remove = useMutation({ mutationFn: (id: number) => scheduleBlocksService.remove(id), onSuccess: refresh });

  return { save, remove };
}
