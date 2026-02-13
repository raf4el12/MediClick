import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserDetailResponseDto } from '../dto/user-detail-response.dto.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateUserDto,
  ): Promise<UserDetailResponseDto> {
    const existing = await this.userRepository.findByIdWithProfile(id);
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updated = await this.userRepository.updateUser(id, {
      role: dto.role,
      isActive: dto.isActive,
      profile: dto.profile,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      profile: updated.profile,
    };
  }
}
