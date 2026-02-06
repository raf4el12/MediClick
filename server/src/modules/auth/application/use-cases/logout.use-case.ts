import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: number): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, null);
  }
}
