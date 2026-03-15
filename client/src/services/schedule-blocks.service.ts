import { api } from '@/libs/axios';
import type {
  ScheduleBlock,
  CreateScheduleBlockPayload,
  UpdateScheduleBlockPayload,
} from '@/views/schedule-blocks/types';

interface PaginatedScheduleBlocks {
  totalRows: number;
  rows: ScheduleBlock[];
  totalPages: number;
  currentPage: number;
}

interface QueryParams {
  currentPage?: number;
  pageSize?: number;
  doctorId?: number;
}

export const scheduleBlocksService = {
  findAll: async (params?: QueryParams): Promise<PaginatedScheduleBlocks> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.currentPage) queryParams.currentPage = params.currentPage;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.doctorId) queryParams.doctorId = params.doctorId;

    const response = await api.get<PaginatedScheduleBlocks>('/schedule-blocks', { params: queryParams });
    return response.data;
  },

  create: async (payload: CreateScheduleBlockPayload): Promise<ScheduleBlock> => {
    const response = await api.post<ScheduleBlock>('/schedule-blocks', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateScheduleBlockPayload): Promise<ScheduleBlock> => {
    const response = await api.patch<ScheduleBlock>(`/schedule-blocks/${id}`, payload);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/schedule-blocks/${id}`);
  },
};
