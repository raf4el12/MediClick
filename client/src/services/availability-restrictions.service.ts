import { api } from '@/libs/axios';
import type { RestrictionImpact, RestrictionImpactQuery } from '@/views/availability/types/restrictions';

export const availabilityRestrictionsService = {
  /** Vista previa de impacto (UI-18): citas activas que una restricción cancelaría. No cambia nada. */
  impact: async (query: RestrictionImpactQuery): Promise<RestrictionImpact> => {
    const response = await api.get<RestrictionImpact>('/availability-restrictions/impact', { params: query });

    return response.data;
  },
};
