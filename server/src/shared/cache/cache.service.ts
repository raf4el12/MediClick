import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 300;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const isDisabled =
      this.configService.get<string>('REDIS_DISABLED') === 'true';
    if (isDisabled) {
      this.logger.log('Redis deshabilitado');
      this.redis = null;
      return;
    }

    const host = this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const portRaw = this.configService.get<string>('REDIS_PORT') ?? '6379';
    const port = Number(portRaw);
    const password =
      this.configService.get<string>('REDIS_PASSWORD') ?? undefined;
    const dbRaw = this.configService.get<string>('REDIS_DB') ?? '0';
    const db = Number(dbRaw);

    this.logger.log(`🔍 Conectando a Redis (${host}:${port})...`);

    try {
      this.redis = new Redis({
        host,
        port: Number.isFinite(port) ? port : 6379,
        password,
        db: Number.isFinite(db) ? db : 0,
        retryStrategy: () => null,
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
      });

      this.redis.on('error', () => {
        // no-op
      });

      await Promise.race([
        this.redis.connect(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 3000),
        ),
      ]);

      this.logger.log(`✅ Redis conectado (${host}:${port})`);
    } catch {
      this.logger.warn('⚠️  Redis no disponible. Funcionando sin caché.');
      if (this.redis) {
        this.redis.removeAllListeners();
        try {
          this.redis.disconnect(false);
        } catch {
          // no-op
        }
      }
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis desconectado');
    }
  }

  private isAvailable(): boolean {
    return this.redis !== null;
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isAvailable() || !this.redis) return undefined;
    try {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : undefined;
    } catch {
      return undefined;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    if (!this.isAvailable() || !this.redis) return;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch {
      // no-op
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.redis) return;
    try {
      await this.redis.del(key);
    } catch {
      // no-op
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable() || !this.redis) return;
    try {
      await this.redis.flushdb();
      this.logger.log('Cache limpiado');
    } catch {
      // no-op
    }
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    if (!this.isAvailable()) return await fn();
    try {
      const cached = await this.get<T>(key);
      if (cached !== undefined) return cached;
      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch {
      return await fn();
    }
  }
}
