import { JobLeaseService } from './job-lease.service.js';
import type { RedisService } from './redis.service.js';

describe('JobLeaseService (SDD-020)', () => {
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

  it('RED->GREEN: adquiere lease, ejecuta tarea y libera el lock al finalizar', async () => {
    redisClient.set.mockResolvedValue('OK');
    redisClient.eval.mockResolvedValue(1);

    const task = jest.fn().mockResolvedValue('success-result');

    const result = await service.withLease('test-job', 60, task);

    expect(result.executed).toBe(true);
    expect(result.result).toBe('success-result');
    expect(task).toHaveBeenCalledTimes(1);

    expect(redisClient.set).toHaveBeenCalledWith(
      'job:lease:test-job',
      expect.any(String) as unknown as string,
      'PX',
      60000,
      'NX',
    );

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.any(String) as unknown as string,
      1,
      'job:lease:test-job',
      expect.any(String) as unknown as string,
    );
  });

  it('RED->GREEN: no ejecuta la tarea si otra réplica ya posee el lease', async () => {
    redisClient.set.mockResolvedValue(null); // Otra réplica ya tomó el lease

    const task = jest.fn();

    const result = await service.withLease('busy-job', 60, task);

    expect(result.executed).toBe(false);
    expect(result.result).toBeUndefined();
    expect(task).not.toHaveBeenCalled();
    expect(redisClient.eval).not.toHaveBeenCalled();
  });

  it('libera el lease incluso si la tarea arroja un error', async () => {
    redisClient.set.mockResolvedValue('OK');
    redisClient.eval.mockResolvedValue(1);

    const task = jest.fn().mockRejectedValue(new Error('Job error'));

    await expect(service.withLease('failing-job', 60, task)).rejects.toThrow(
      'Job error',
    );

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.any(String) as unknown as string,
      1,
      'job:lease:failing-job',
      expect.any(String) as unknown as string,
    );
  });

  it('ejecuta la tarea como fallback degradado si Redis falla o arroja error de conexión', async () => {
    redisClient.set.mockRejectedValue(new Error('Connection refused'));

    const task = jest.fn().mockResolvedValue('fallback-done');

    const result = await service.withLease('degraded-job', 60, task);

    expect(result.executed).toBe(true);
    expect(result.result).toBe('fallback-done');
    expect(task).toHaveBeenCalledTimes(1);
  });
});
