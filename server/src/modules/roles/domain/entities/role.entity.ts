import { PermissionEntity } from '../../../permissions/domain/entities/permission.entity.js';

export class RoleEntity {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  clinicId: number | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  permissions: PermissionEntity[];
}
