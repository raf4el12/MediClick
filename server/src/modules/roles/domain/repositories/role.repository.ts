import { RoleEntity } from '../entities/role.entity.js';

export interface IRoleRepository {
  findAll(clinicId?: number | null): Promise<RoleEntity[]>;
  findById(id: number): Promise<RoleEntity | null>;
  findByName(name: string, clinicId?: number | null): Promise<RoleEntity | null>;
  create(data: {
    name: string;
    description?: string;
    isSystem?: boolean;
    clinicId?: number;
    permissionIds?: number[];
  }): Promise<RoleEntity>;
  update(
    id: number,
    data: { name?: string; description?: string; permissionIds?: number[] },
  ): Promise<RoleEntity>;
  softDelete(id: number): Promise<void>;
  setPermissions(roleId: number, permissionIds: number[]): Promise<void>;
}
