import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateRoleDto } from '../dto/update-role.dto.js';
import { RoleResponseDto } from '../dto/role-response.dto.js';
import type { IRoleRepository } from '../../domain/repositories/role.repository.js';
import { RedisService } from '../../../../shared/redis/redis.service.js';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject('IRoleRepository')
    private readonly roleRepository: IRoleRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(
    id: number,
    dto: UpdateRoleDto,
    clinicId?: number | null,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystem) {
      throw new ForbiddenException('No se pueden modificar roles del sistema');
    }

    if (clinicId && role.clinicId !== clinicId) {
      throw new ForbiddenException('No tienes acceso a este rol');
    }

    const updated = await this.roleRepository.update(id, {
      name: dto.name,
      description: dto.description,
      permissionIds: dto.permissionIds,
    });

    // Invalidar caché de permisos para este rol
    await this.redisService.del(`role_permissions:${id}`);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      clinicId: updated.clinicId,
      permissions: updated.permissions.map((p) => ({
        id: p.id,
        action: p.action,
        subject: p.subject,
        description: p.description,
      })),
      createdAt: updated.createdAt,
    };
  }
}
