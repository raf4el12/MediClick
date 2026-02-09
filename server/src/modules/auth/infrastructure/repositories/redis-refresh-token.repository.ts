import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';
import { RefreshTokenData } from '../../domain/interfaces/refresh-token-data.interface.js';

@Injectable()
export class RedisRefreshTokenRepository implements IRefreshTokenRepository {
  private readonly logger = new Logger(RedisRefreshTokenRepository.name);
  private readonly KEY_PREFIX = 'auth:refresh';

  constructor(private readonly redisService: RedisService) {}

  private buildKey(userId: number, deviceId: string): string {
    return `${this.KEY_PREFIX}:${userId}:${deviceId}`;
  }

  private buildUserPattern(userId: number): string {
    return `${this.KEY_PREFIX}:${userId}:*`;
  }

  async save(data: RefreshTokenData, ttlSeconds: number): Promise<void> {
    const key = this.buildKey(data.userId, data.deviceId);
    const value = JSON.stringify(data);
    await this.redisService.set(key, value, ttlSeconds);
  }

  async findByUserDevice(
    userId: number,
    deviceId: string,
  ): Promise<RefreshTokenData | null> {
    const key = this.buildKey(userId, deviceId);
    const value = await this.redisService.get(key);

    if (!value) return null;

    try {
      return JSON.parse(value) as RefreshTokenData;
    } catch {
      this.logger.warn(`Invalid refresh token data for key: ${key}`);
      await this.redisService.del(key);
      return null;
    }
  }

  async deleteByUserDevice(userId: number, deviceId: string): Promise<void> {
    const key = this.buildKey(userId, deviceId);
    await this.redisService.del(key);
  }

  async deleteAllByUser(userId: number): Promise<void> {
    const pattern = this.buildUserPattern(userId);
    await this.redisService.delByPattern(pattern);
  }
}
