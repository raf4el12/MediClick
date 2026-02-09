import { Injectable, Inject } from '@nestjs/common';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';

@Injectable()
export class LogoutAllDevicesUseCase {
  constructor(
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(userId: number): Promise<void> {
    await this.refreshTokenRepository.deleteAllByUser(userId);
  }
}
