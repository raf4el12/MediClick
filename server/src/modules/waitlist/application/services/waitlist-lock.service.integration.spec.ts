import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import { WaitlistLockService } from './waitlist-lock.service.js';

/**
 * SDD-014 (G-02) — prueba contra Redis real de la garantía central: un owner
 * cuyo token ya no es el dueño actual del lock (porque otro proceso lo
 * renovó tras un TTL vencido) NO puede liberarlo. Esto certifica el
 * comportamiento del script Lua de compare-and-delete contra el servidor
 * real, no solo contra el mock de ioredis.
 *
 * Requiere Redis real: `RUN_REDIS_INTEGRATION=1 pnpm test -- waitlist-lock.service.integration`
 * (con `docker compose up -d` corrido en `server/`).
 */
const describeRedis =
  process.env.RUN_REDIS_INTEGRATION === '1' ? describe : describe.skip;

describeRedis('WaitlistLockService (Redis real)', () => {
  let redisService: RedisService;
  let lock: WaitlistLockService;
  const scheduleId = 999_014;
  const startTime = new Date('2030-01-01T09:00:00Z');

  beforeAll(() => {
    // Instanciado en beforeAll (no en el cuerpo del describe): describe.skip
    // sí evalúa el cuerpo del callback para registrar los tests, pero nunca
    // ejecuta beforeAll/afterAll — así, cuando este spec corre sin
    // RUN_REDIS_INTEGRATION=1, nunca se abre una conexión Redis real que
    // quedaría sin cerrar (handle abierto que cuelga el proceso de Jest).
    redisService = new RedisService(new ConfigService());
    lock = new WaitlistLockService(redisService);
  });

  afterEach(async () => {
    // Limpieza directa por si un test deja el lock vivo.
    await redisService
      .getClient()
      .del(`waitlist:lock:${scheduleId}:${startTime.toISOString()}`);
  });

  afterAll(async () => {
    await redisService.onModuleDestroy();
  });

  it('caso permitido: el dueño actual libera su propio lock con su token', async () => {
    const ownerToken = lock.createToken();
    const acquired = await lock.acquire(scheduleId, startTime, ownerToken);
    expect(acquired).toBe(true);

    const released = await lock.release(scheduleId, startTime, ownerToken);
    expect(released).toBe(true);

    // El lock ya no existe: un tercero puede adquirirlo.
    const reacquired = await lock.acquire(
      scheduleId,
      startTime,
      lock.createToken(),
    );
    expect(reacquired).toBe(true);
  });

  it('frontera rechazada: un owner vencido no libera el lock renovado por otro dueño (G-02)', async () => {
    // 1. El primer dueño adquiere el lock.
    const firstOwnerToken = lock.createToken();
    await lock.acquire(scheduleId, startTime, firstOwnerToken);

    // 2. Simula que el TTL del primer dueño venció y fue liberado por
    //    Redis, y un segundo proceso adquirió el lock renovado para el
    //    mismo slot con un token distinto.
    await redisService
      .getClient()
      .del(`waitlist:lock:${scheduleId}:${startTime.toISOString()}`);
    const secondOwnerToken = lock.createToken();
    const secondAcquired = await lock.acquire(
      scheduleId,
      startTime,
      secondOwnerToken,
    );
    expect(secondAcquired).toBe(true);

    // 3. El primer dueño, sin saber que perdió el lock, intenta liberarlo
    //    con su token vencido. Antes de SDD-014 esto habría ejecutado un
    //    DEL incondicional y roto el lock del segundo dueño.
    const releasedByFirstOwner = await lock.release(
      scheduleId,
      startTime,
      firstOwnerToken,
    );
    expect(releasedByFirstOwner).toBe(false);

    // 4. El lock del segundo dueño sigue intacto: solo él puede liberarlo.
    const releasedBySecondOwner = await lock.release(
      scheduleId,
      startTime,
      secondOwnerToken,
    );
    expect(releasedBySecondOwner).toBe(true);
  });

  it('un tercero sin token nunca coincide y nunca libera el lock de otro', async () => {
    const ownerToken = lock.createToken();
    await lock.acquire(scheduleId, startTime, ownerToken);

    const releasedByStranger = await lock.release(
      scheduleId,
      startTime,
      'un-token-que-nadie-tiene',
    );
    expect(releasedByStranger).toBe(false);

    // El dueño real sigue pudiendo liberar su propio lock después.
    const releasedByOwner = await lock.release(
      scheduleId,
      startTime,
      ownerToken,
    );
    expect(releasedByOwner).toBe(true);
  });
});
