import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserDetailResponseDto } from '../dto/user-detail-response.dto.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    id: number,
    dto: UpdateUserDto,
    clinicId?: number | null,
  ): Promise<UserDetailResponseDto> {
    const existing = await this.userRepository.findByIdWithProfile(id);
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este usuario');
    }

    let roleId: number | undefined;
    if (dto.role) {
      const roleRecord = await this.prisma.roles.findFirst({
        where: { name: dto.role, isSystem: true },
      });
      if (!roleRecord) {
        throw new BadRequestException(`El rol '${dto.role}' no existe`);
      }
      roleId = roleRecord.id;
    }

    const updated = await this.userRepository.updateUser(id, {
      roleId,
      isActive: dto.isActive,
      profile: dto.profile,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.roleName as UserRole,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      profile: updated.profile,
    };
  }
}
