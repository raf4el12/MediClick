import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import {
  LOCK_TTL_SECONDS,
  WAITLIST_LOCK_PREFIX,
} from '../../domain/constants/waitlist.constants.js';

/**
 * Script Lua de compare-and-delete: solo borra la key si su valor actual
 * coincide exactamente con el token del dueño. Se ejecuta como una única
 * operación atómica en el servidor de Redis (no hay ventana entre leer y
 * borrar donde otro proceso pueda intervenir).
 *
 * KEYS[1] = key del lock
 * ARGV[1] = token esperado
 * Retorna 1 si borró, 0 si el valor no coincidía (o la key no existía).
 */
const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

/**
 * Lock por slot para que un mismo hueco liberado no se ofrezca en paralelo
 * a dos pacientes. Se toma con SET NX (atómico) y vive hasta que la oferta
 * se resuelve (aceptada/rechazada/expirada) o el TTL lo libera por seguridad.
 *
 * SDD-014 (G-02): el valor de la key es un token por dueño, no una constante.
 * `release` solo borra si el token coincide con el dueño actual — así, si el
 * TTL de una ejecución vence y otro proceso adquiere el lock renovado para el
 * mismo slot, la ejecución original ya no puede liberar (ni pisar) el lock
 * ajeno al llamar release con su propio token vencido.
 */
@Injectable()
export class WaitlistLockService {
  constructor(private readonly redis: RedisService) {}

  private key(scheduleId: number, startTime: Date): string {
    return `${WAITLIST_LOCK_PREFIX}:${scheduleId}:${startTime.toISOString()}`;
  }

  /** Genera un token aleatorio único para identificar al dueño del lock. */
  createToken(): string {
    return randomUUID();
  }

  /**
   * Intenta tomar el lock del slot con el token del dueño. `true` si lo
   * obtuvo, `false` si ya estaba tomado (por el mismo u otro token).
   */
  async acquire(
    scheduleId: number,
    startTime: Date,
    token: string,
  ): Promise<boolean> {
    const result = await this.redis
      .getClient()
      .set(
        this.key(scheduleId, startTime),
        token,
        'PX',
        LOCK_TTL_SECONDS * 1000,
        'NX',
      );
    return result === 'OK';
  }

  /**
   * Libera el lock solo si `token` coincide con el valor actual almacenado
   * (compare-and-delete atómico). Retorna `true` si liberó, `false` si el
   * lock ya no le pertenecía (fue renovado por otro dueño) o ya no existía.
   */
  async release(
    scheduleId: number,
    startTime: Date,
    token: string,
  ): Promise<boolean> {
    const deleted = await this.redis
      .getClient()
      .eval(RELEASE_IF_OWNER_SCRIPT, 1, this.key(scheduleId, startTime), token);
    return deleted === 1;
  }
}
