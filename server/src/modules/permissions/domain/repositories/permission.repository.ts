import { PermissionEntity } from '../entities/permission.entity.js';

export interface IPermissionRepository {
  findAll(): Promise<PermissionEntity[]>;
  findById(id: number): Promise<PermissionEntity | null>;
  findByIds(ids: number[]): Promise<PermissionEntity[]>;
  findByRoleId(roleId: number): Promise<PermissionEntity[]>;
  upsert(action: string, subject: string, description?: string): Promise<PermissionEntity>;
}
