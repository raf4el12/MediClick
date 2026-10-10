import { api } from '@/libs/axios';
import type { AgendaScope, AgendaSnapshot, DateRange } from '@/views/agenda/types';

export const agendaService = {
  get: async (scope: AgendaScope, range: DateRange): Promise<AgendaSnapshot> => {
    const response = await api.get<AgendaSnapshot>('/agenda', { params: { ...scope, ...range } });

    return response.data;
  },
};
