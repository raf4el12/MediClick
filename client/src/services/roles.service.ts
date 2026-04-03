import { api } from '@/libs/axios';

export interface PermissionDto {
  id: number;
  action: string;
  subject: string;
  description: string | null;
}

export interface RoleDto {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  clinicId: number | null;
  permissions: PermissionDto[];
  createdAt: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

export const rolesService = {
  findAll: async (): Promise<RoleDto[]> => {
    const response = await api.get<RoleDto[]>('/roles');
    return response.data;
  },

  create: async (payload: CreateRolePayload): Promise<RoleDto> => {
    const response = await api.post<RoleDto>('/roles', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateRolePayload): Promise<RoleDto> => {
    const response = await api.patch<RoleDto>(`/roles/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  getAllPermissions: async (): Promise<PermissionDto[]> => {
    const response = await api.get<PermissionDto[]>('/permissions');
    return response.data;
  },
};
