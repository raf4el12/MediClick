import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IPermissionRepository } from '../../domain/repositories/permission.repository.js';
import { PermissionEntity } from '../../domain/entities/permission.entity.js';

@Injectable()
export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permissions.findMany({
      orderBy: [{ subject: 'asc' }, { action: 'asc' }],
    });
    return rows.map(this.toEntity);
  }

  async findById(id: number): Promise<PermissionEntity | null> {
    const row = await this.prisma.permissions.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByIds(ids: number[]): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permissions.findMany({
      where: { id: { in: ids } },
    });
    return rows.map(this.toEntity);
  }

  async findByRoleId(roleId: number): Promise<PermissionEntity[]> {
    const rows = await this.prisma.rolePermissions.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((rp) => this.toEntity(rp.permission));
  }

  async upsert(
    action: string,
    subject: string,
    description?: string,
  ): Promise<PermissionEntity> {
    const row = await this.prisma.permissions.upsert({
      where: { action_subject: { action, subject } },
      update: { description },
      create: { action, subject, description },
    });
    return this.toEntity(row);
  }

  private toEntity(row: any): PermissionEntity {
    const entity = new PermissionEntity();
    entity.id = row.id;
    entity.action = row.action;
    entity.subject = row.subject;
    entity.description = row.description;
    return entity;
  }
}
