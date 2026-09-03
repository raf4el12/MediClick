import { HealthController } from './health.controller.js';
import type { HealthCheckService } from '@nestjs/terminus';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RedisService } from '../redis/redis.service.js';
import type { OperationalHealthService } from './operational-health.service.js';

describe('HealthController (Infraestructura y Telemetría Operativa)', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<Pick<HealthCheckService, 'check'>>;
  let prismaService: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;
  let redisService: jest.Mocked<Pick<RedisService, 'isHealthy'>>;
  let operationalHealth: jest.Mocked<
    Pick<OperationalHealthService, 'getVitalSigns'>
  >;

  beforeEach(() => {
    healthCheckService = {
      check: jest
        .fn()
        .mockImplementation((indicators: Array<() => Promise<unknown>>) => {
          return Promise.all(indicators.map((fn) => fn()));
        }),
    };
    prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([1]),
    };
    redisService = {
      isHealthy: jest.fn().mockResolvedValue(true),
    };
    operationalHealth = {
      getVitalSigns: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        vitalSigns: {
          appointments: { pendingExpired: 0, atRisk: 1 },
          waitlist: { activeWaitlist: 3, pendingOffers: 1, staleOffers: 0 },
        },
        alerts: [],
      }),
    };

    controller = new HealthController(
      healthCheckService as unknown as HealthCheckService,
      prismaService as unknown as PrismaService,
      redisService as unknown as RedisService,
      operationalHealth as unknown as OperationalHealthService,
    );
  });

  it('RED->GREEN: endpoint /health valida base de datos y redis', async () => {
    const result = await controller.check();
    expect(result).toEqual([
      { database: { status: 'up' } },
      { redis: { status: 'up' } },
    ]);
  });

  it('RED->GREEN: endpoint /health/operational expone signos vitales y estado del core', async () => {
    const result = await controller.operational();
    expect(result.status).toBe('healthy');
    expect(result.vitalSigns.appointments.atRisk).toBe(1);
    expect(operationalHealth.getVitalSigns).toHaveBeenCalled();
  });
});
