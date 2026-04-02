import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IRoleRepository } from '../../domain/repositories/role.repository.js';
import { RoleEntity } from '../../domain/entities/role.entity.js';

const includePermissions = {
  permissions: {
    include: { permission: true },
  },
} as const;

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId?: number | null): Promise<RoleEntity[]> {
    const rows = await this.prisma.roles.findMany({
      where: {
        deleted: false,
        OR: [
          { isSystem: true },
          ...(clinicId ? [{ clinicId }] : []),
        ],
      },
      include: includePermissions,
      orderBy: { name: 'asc' },
    });
    return rows.map(this.toEntity);
  }

  async findById(id: number): Promise<RoleEntity | null> {
    const row = await this.prisma.roles.findFirst({
      where: { id, deleted: false },
      include: includePermissions,
    });
    return row ? this.toEntity(row) : null;
  }

  async findByName(
    name: string,
    clinicId?: number | null,
  ): Promise<RoleEntity | null> {
    const row = await this.prisma.roles.findFirst({
      where: {
        name,
        deleted: false,
        ...(clinicId ? { clinicId } : { clinicId: null }),
      },
      include: includePermissions,
    });
    return row ? this.toEntity(row) : null;
  }

  async create(data: {
    name: string;
    description?: string;
    isSystem?: boolean;
    clinicId?: number;
    permissionIds?: number[];
  }): Promise<RoleEntity> {
    const row = await this.prisma.roles.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: data.isSystem ?? false,
        clinicId: data.clinicId,
        permissions: data.permissionIds?.length
          ? {
              create: data.permissionIds.map((pid) => ({
                permissionId: pid,
              })),
            }
          : undefined,
      },
      include: includePermissions,
    });
    return this.toEntity(row);
  }

  async update(
    id: number,
    data: { name?: string; description?: string; permissionIds?: number[] },
  ): Promise<RoleEntity> {
    return this.prisma.$transaction(async (tx) => {
      await tx.roles.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          updatedAt: new Date(),
        },
      });

      if (data.permissionIds) {
        await tx.rolePermissions.deleteMany({ where: { roleId: id } });
        if (data.permissionIds.length > 0) {
          await tx.rolePermissions.createMany({
            data: data.permissionIds.map((pid) => ({
              roleId: id,
              permissionId: pid,
            })),
          });
        }
      }

      const updated = await tx.roles.findUniqueOrThrow({
        where: { id },
        include: includePermissions,
      });
      return this.toEntity(updated);
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.roles.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }

  async setPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermissions.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermissions.createMany({
          data: permissionIds.map((pid) => ({
            roleId,
            permissionId: pid,
          })),
        });
      }
    });
  }

  private toEntity(row: any): RoleEntity {
    const entity = new RoleEntity();
    entity.id = row.id;
    entity.name = row.name;
    entity.description = row.description;
    entity.isSystem = row.isSystem;
    entity.clinicId = row.clinicId;
    entity.deleted = row.deleted;
    entity.createdAt = row.createdAt;
    entity.updatedAt = row.updatedAt;
    entity.permissions = (row.permissions ?? []).map((rp: any) => ({
      id: rp.permission.id,
      action: rp.permission.action,
      subject: rp.permission.subject,
      description: rp.permission.description,
    }));
    return entity;
  }
}
