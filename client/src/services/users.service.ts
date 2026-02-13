import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/views/users/types';

export const usersService = {
  findAllPaginated: async (
    params: PaginationParams,
    role?: string,
  ): Promise<PaginatedResponse<User>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (role) queryParams.role = role;

    const response = await api.get<PaginatedResponse<User>>(
      '/users',
      { params: queryParams },
    );

    return response.data;
  },

  findById: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);

    return response.data;
  },

  createInternal: async (payload: CreateUserPayload): Promise<User> => {
    const response = await api.post<User>('/users/internal', payload);

    return response.data;
  },

  update: async (id: number, payload: UpdateUserPayload): Promise<User> => {
    const response = await api.patch<User>(`/users/${id}`, payload);

    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
