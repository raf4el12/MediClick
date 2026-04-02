import { Injectable, Inject } from '@nestjs/common';
import { RoleResponseDto } from '../dto/role-response.dto.js';
import type { IRoleRepository } from '../../domain/repositories/role.repository.js';

@Injectable()
export class FindAllRolesUseCase {
  constructor(
    @Inject('IRoleRepository')
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(clinicId?: number | null): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.findAll(clinicId);
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      clinicId: r.clinicId,
      permissions: r.permissions.map((p) => ({
        id: p.id,
        action: p.action,
        subject: p.subject,
        description: p.description,
      })),
      createdAt: r.createdAt,
    }));
  }
}
