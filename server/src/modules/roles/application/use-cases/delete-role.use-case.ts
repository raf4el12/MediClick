import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IRoleRepository } from '../../domain/repositories/role.repository.js';
import { RedisService } from '../../../../shared/redis/redis.service.js';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject('IRoleRepository')
    private readonly roleRepository: IRoleRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystem) {
      throw new ForbiddenException('No se pueden eliminar roles del sistema');
    }

    if (clinicId && role.clinicId !== clinicId) {
      throw new ForbiddenException('No tienes acceso a este rol');
    }

    await this.roleRepository.softDelete(id);
    await this.redisService.del(`role_permissions:${id}`);
  }
}
