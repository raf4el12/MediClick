import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateRoleDto } from '../dto/create-role.dto.js';
import { RoleResponseDto } from '../dto/role-response.dto.js';
import type { IRoleRepository } from '../../domain/repositories/role.repository.js';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject('IRoleRepository')
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(
    dto: CreateRoleDto,
    clinicId?: number | null,
  ): Promise<RoleResponseDto> {
    if (!clinicId) {
      throw new ForbiddenException(
        'Solo administradores de clínica pueden crear roles personalizados',
      );
    }

    const existing = await this.roleRepository.findByName(dto.name, clinicId);
    if (existing) {
      throw new ConflictException(`Ya existe un rol con el nombre "${dto.name}" en esta clínica`);
    }

    const role = await this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      clinicId,
      permissionIds: dto.permissionIds,
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      clinicId: role.clinicId,
      permissions: role.permissions.map((p) => ({
        id: p.id,
        action: p.action,
        subject: p.subject,
        description: p.description,
      })),
      createdAt: role.createdAt,
    };
  }
}
