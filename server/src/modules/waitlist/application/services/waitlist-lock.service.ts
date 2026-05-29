import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import {
  LOCK_TTL_SECONDS,
  WAITLIST_LOCK_PREFIX,
} from '../../domain/constants/waitlist.constants.js';

/**
 * Lock por slot para que un mismo hueco liberado no se ofrezca en paralelo
 * a dos pacientes. Se toma con SET NX (atómico) y vive hasta que la oferta
 * se resuelve (aceptada/rechazada/expirada) o el TTL lo libera por seguridad.
 */
@Injectable()
export class WaitlistLockService {
  constructor(private readonly redis: RedisService) {}

  private key(scheduleId: number, startTime: Date): string {
    return `${WAITLIST_LOCK_PREFIX}:${scheduleId}:${startTime.toISOString()}`;
  }

  /** Intenta tomar el lock del slot. `true` si lo obtuvo, `false` si ya estaba tomado. */
  async acquire(scheduleId: number, startTime: Date): Promise<boolean> {
    const result = await this.redis
      .getClient()
      .set(this.key(scheduleId, startTime), '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    return result === 'OK';
  }

  async release(scheduleId: number, startTime: Date): Promise<void> {
    await this.redis.del(this.key(scheduleId, startTime));
  }
}
