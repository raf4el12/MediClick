import { Injectable, Inject } from '@nestjs/common';
import { PermissionResponseDto } from '../dto/permission-response.dto.js';
import type { IPermissionRepository } from '../../domain/repositories/permission.repository.js';

@Injectable()
export class FindAllPermissionsUseCase {
  constructor(
    @Inject('IPermissionRepository')
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.findAll();
    return permissions.map((p) => ({
      id: p.id,
      action: p.action,
      subject: p.subject,
      description: p.description,
    }));
  }
}
