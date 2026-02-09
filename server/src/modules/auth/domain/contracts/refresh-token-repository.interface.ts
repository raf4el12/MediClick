import { RefreshTokenData } from '../interfaces/refresh-token-data.interface.js';

export interface IRefreshTokenRepository {
  save(data: RefreshTokenData, ttlSeconds: number): Promise<void>;
  findByUserDevice(
    userId: number,
    deviceId: string,
  ): Promise<RefreshTokenData | null>;
  deleteByUserDevice(userId: number, deviceId: string): Promise<void>;
  deleteAllByUser(userId: number): Promise<void>;
}
