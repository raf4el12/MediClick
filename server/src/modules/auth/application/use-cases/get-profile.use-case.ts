import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { UserWithProfile } from '../../../users/domain/interfaces/user-data.interface.js';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: number): Promise<UserWithProfile> {
    const user = await this.userRepository.findByIdWithProfile(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }
}
