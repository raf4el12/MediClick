import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UserDetailResponseDto } from '../dto/user-detail-response.dto.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: number): Promise<UserDetailResponseDto> {
    const u = await this.userRepository.findByIdWithProfile(id);
    if (!u) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      profile: u.profile,
    };
  }
}
