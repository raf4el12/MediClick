import { Injectable, Inject } from '@nestjs/common';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';

export interface SessionInfo {
  deviceId: string;
  createdAt: number;
  isCurrent: boolean;
}

@Injectable()
export class GetSessionsUseCase {
  constructor(
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(
    userId: number,
    currentDeviceId: string,
  ): Promise<SessionInfo[]> {
    const sessions = await this.refreshTokenRepository.findAllByUser(userId);

    return sessions
      .map((s) => ({
        deviceId: s.deviceId,
        createdAt: s.createdAt,
        isCurrent: s.deviceId === currentDeviceId,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}
