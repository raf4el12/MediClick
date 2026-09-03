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
  skippedReason?: 'ALREADY_CLAIMED' | 'LEASE_UNAVAILABLE';
}

/**
 * SDD-020 (P1): Leases distribuidos para jobs de scheduler basados en ventana lógica.
 * Garantiza que un job se ejecute como máximo una vez por ventana lógica UTC
 * entre múltiples réplicas del backend. Modo fail-closed ante caída de Redis.
 */
@Injectable()
export class JobLeaseService {
  private readonly logger = new Logger(JobLeaseService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Ejecuta `fn` de forma exclusiva para la ventana lógica indicada si adquiere el lease en Redis.
   * - Si otra réplica ya posee el lease para esa ventana, omite la ejecución con 'ALREADY_CLAIMED'.
   * - Si Redis no está disponible o arroja un error, actúa en modo fail-closed retornando 'LEASE_UNAVAILABLE'.
   * - Si la ejecución es exitosa, conserva la clave viva hasta su TTL (no libera la clave en éxito).
   * - Si la ejecución falla (arroja excepción), libera el lease para permitir reintentos en la misma ventana y relanza el error.
   */
  async withLease<T>(
    jobName: string,
    windowId: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<JobLeaseResult<T>> {
    const key = `job:lease:${jobName}:${windowId}`;
    const token = randomUUID();

    try {
      const response = await this.redis
        .getClient()
        .set(key, token, 'PX', ttlSeconds * 1000, 'NX');

      if (response !== 'OK') {
        this.logger.debug(
          `[LEASE] Job '${jobName}' ya reclamado para la ventana '${windowId}'. Omitiendo ejecución.`,
        );
        return {
          executed: false,
          skippedReason: 'ALREADY_CLAIMED',
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[LEASE] Redis no disponible para adquirir lease de job '${jobName}' ventana '${windowId}': ${message}. Modo fail-closed.`,
      );
      return {
        executed: false,
        skippedReason: 'LEASE_UNAVAILABLE',
      };
    }

    try {
      const result = await fn();
      return { executed: true, result };
    } catch (jobError: unknown) {
      // Liberar el lease poseído para permitir que otro intento en la misma ventana pueda ejecutarse
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
          `[LEASE] Error liberando lease tras fallo de job '${jobName}' ventana '${windowId}': ${message}`,
        );
      }
      throw jobError;
    }
  }
}
