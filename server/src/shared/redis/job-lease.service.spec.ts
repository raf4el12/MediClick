import { JobLeaseService } from './job-lease.service.js';
import type { RedisService } from './redis.service.js';

describe('JobLeaseService (SDD-020: Logical-Window Leases)', () => {
  let service: JobLeaseService;
  let redisClient: {
    set: jest.Mock<
      Promise<string | null>,
      [string, string, string, number, string]
    >;
    eval: jest.Mock<Promise<number>, [string, number, string, string]>;
  };
  let redisService: jest.Mocked<Pick<RedisService, 'getClient'>>;

  beforeEach(() => {
    redisClient = {
      set: jest.fn<
        Promise<string | null>,
        [string, string, string, number, string]
      >(),
      eval: jest.fn<Promise<number>, [string, number, string, string]>(),
    };

    redisService = {
      getClient: jest.fn().mockReturnValue(redisClient),
    } as unknown as jest.Mocked<Pick<RedisService, 'getClient'>>;

    service = new JobLeaseService(redisService as unknown as RedisService);
  });

  it('RED->GREEN: adquiere lease con ventana lógica, ejecuta tarea y mantiene la clave viva (no llama eval en éxito)', async () => {
    redisClient.set.mockResolvedValue('OK');
    const task = jest.fn().mockResolvedValue('success-result');

    const result = await service.withLease(
      'test-job',
      '2026-09-02T10:15Z',
      900,
      task,
    );

    expect(result.executed).toBe(true);
    expect(result.result).toBe('success-result');
    expect(task).toHaveBeenCalledTimes(1);

    expect(redisClient.set).toHaveBeenCalledWith(
      'job:lease:test-job:2026-09-02T10:15Z',
      expect.any(String),
      'PX',
      900_000,
      'NX',
    );
    expect(redisClient.eval).not.toHaveBeenCalled();
  });

  it('RED->GREEN: no ejecuta la tarea si otra réplica ya posee el lease para esa ventana (ALREADY_CLAIMED)', async () => {
    redisClient.set.mockResolvedValue(null);
    const task = jest.fn();

    const result = await service.withLease('busy-job', 'window-1', 60, task);

    expect(result).toEqual({
      executed: false,
      skippedReason: 'ALREADY_CLAIMED',
    });
    expect(task).not.toHaveBeenCalled();
    expect(redisClient.eval).not.toHaveBeenCalled();
  });

  it('RED->GREEN: si la tarea arroja un error, libera el lease con eval para permitir reintento y relanza el error', async () => {
    redisClient.set.mockResolvedValue('OK');
    redisClient.eval.mockResolvedValue(1);

    await expect(
      service.withLease('test-job', 'window-1', 60, () =>
        Promise.reject(new Error('job failed')),
      ),
    ).rejects.toThrow('job failed');

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'job:lease:test-job:window-1',
      expect.any(String),
    );
  });

  it('RED->GREEN: en caso de error o indisponibilidad de Redis, actúa en modo fail-closed (LEASE_UNAVAILABLE sin ejecutar callback)', async () => {
    redisClient.set.mockRejectedValue(new Error('Connection refused'));
    const task = jest.fn().mockResolvedValue('should-not-run');

    const result = await service.withLease(
      'test-job',
      '2026-09-02T10:15Z',
      900,
      task,
    );

    expect(result).toEqual({
      executed: false,
      skippedReason: 'LEASE_UNAVAILABLE',
    });
    expect(task).not.toHaveBeenCalled();
  });
});
