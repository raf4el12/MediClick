import { RefreshTokenData } from '../interfaces/refresh-token-data.interface.js';

export interface IRefreshTokenRepository {
  save(data: RefreshTokenData, ttlSeconds: number): Promise<void>;
  findByUserDevice(
    userId: number,
    deviceId: string,
  ): Promise<RefreshTokenData | null>;
  findAllByUser(userId: number): Promise<RefreshTokenData[]>;
  deleteByUserDevice(userId: number, deviceId: string): Promise<void>;
  deleteAllByUser(userId: number): Promise<void>;
}
