import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

export interface JobLeaseResult<T> {
  executed: boolean;
  result?: T;
}

/**
 * SDD-020 (P2): Leases distribuidos para jobs de scheduler.
 * Evita que múltiples réplicas del backend ejecuten simultáneamente
 * escaneos o procesamientos periódicos en segundo plano.
 */
@Injectable()
export class JobLeaseService {
  private readonly logger = new Logger(JobLeaseService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Ejecuta `fn` de forma exclusiva si adquiere el lease en Redis con el TTL indicado.
   * Si otra réplica ya posee el lease, omite la ejecución de forma idempotente.
   * En caso de indisponibilidad de Redis, actúa como fallback ejecutando la tarea.
   */
  async withLease<T>(
    jobName: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<JobLeaseResult<T>> {
    const key = `job:lease:${jobName}`;
    const token = randomUUID();

    let acquired = false;
    let fallbackMode = false;

    try {
      const response = await this.redis
        .getClient()
        .set(key, token, 'PX', ttlSeconds * 1000, 'NX');
      acquired = response === 'OK';
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[LEASE] Redis no disponible para adquirir lease de job '${jobName}': ${message}. Ejecutando en modo fallback.`,
      );
      acquired = true;
      fallbackMode = true;
    }

    if (!acquired) {
      this.logger.debug(
        `[LEASE] Job '${jobName}' ya está siendo ejecutado por otra instancia. Omitiendo ejecución.`,
      );
      return { executed: false };
    }

    try {
      const result = await fn();
      return { executed: true, result };
    } finally {
      if (!fallbackMode) {
        try {
          await this.redis
            .getClient()
            .eval(RELEASE_IF_OWNER_SCRIPT, 1, key, token);
        } catch (releaseError: unknown) {
          const message =
            releaseError instanceof Error
              ? releaseError.message
              : String(releaseError);
          this.logger.warn(
            `[LEASE] Error liberando lease de job '${jobName}': ${message}`,
          );
        }
      }
    }
  }
}
