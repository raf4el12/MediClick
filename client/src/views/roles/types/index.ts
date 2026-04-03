export type { RoleDto, PermissionDto, CreateRolePayload, UpdateRolePayload } from '@/services/roles.service';

/** Permisos agrupados por subject para la UI de checkboxes */
export interface PermissionGroup {
  subject: string;
  permissions: {
    id: number;
    action: string;
    description: string | null;
  }[];
}
