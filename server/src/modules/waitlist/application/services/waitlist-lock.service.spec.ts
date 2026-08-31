import { WaitlistLockService } from './waitlist-lock.service.js';

/**
 * SDD-014 (G-02): el lock usaba un valor constante y `DEL` puro para liberar.
 * Si el TTL vencía y otro proceso tomaba el lock renovado, el primer dueño
 * podía liberar el lock del segundo sin saberlo. Ahora `acquire` recibe un
 * token por dueño y `release` solo borra si el token coincide (compare-and-
 * delete vía Lua, atómico en el servidor de Redis).
 */
describe('WaitlistLockService', () => {
  let redis: any;
  let client: any;
  let service: WaitlistLockService;

  beforeEach(() => {
    client = { set: jest.fn(), eval: jest.fn() };
    redis = { getClient: jest.fn().mockReturnValue(client) };
    service = new WaitlistLockService(redis);
  });

  it('acquire: adquiere el lock con SET NX y el token dado, retorna true si tuvo éxito', async () => {
    client.set.mockResolvedValue('OK');

    const acquired = await service.acquire(100, new Date(0), 'token-a');

    expect(acquired).toBe(true);
    expect(client.set).toHaveBeenCalledWith(
      expect.stringContaining('100'),
      'token-a',
      'PX',
      expect.any(Number),
      'NX',
    );
  });

  it('acquire: retorna false si el slot ya estaba tomado (SET NX no aplicó)', async () => {
    client.set.mockResolvedValue(null);

    const acquired = await service.acquire(100, new Date(0), 'token-a');

    expect(acquired).toBe(false);
  });

  it('release: libera el lock cuando el token coincide con el dueño actual (caso permitido)', async () => {
    client.eval.mockResolvedValue(1); // el script Lua borró la key

    const released = await service.release(100, new Date(0), 'token-a');

    expect(released).toBe(true);
    expect(client.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.stringContaining('100'),
      'token-a',
    );
  });

  it('release: NO libera el lock si el token no coincide con el dueño actual (frontera rechazada — G-02)', async () => {
    client.eval.mockResolvedValue(0); // el script Lua no encontró el token esperado

    const released = await service.release(100, new Date(0), 'token-b');

    expect(released).toBe(false);
  });

  it('release es atómico vía un único comando eval, no un GET seguido de DEL', async () => {
    client.eval.mockResolvedValue(1);

    await service.release(100, new Date(0), 'token-a');

    expect(client.eval).toHaveBeenCalledTimes(1);
    expect(client.get).toBeUndefined();
  });
});
