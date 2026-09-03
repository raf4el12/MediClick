import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  OperationalHealthService,
  OperationalVitalSigns,
} from './operational-health.service.js';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly operationalHealth: OperationalHealthService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check del sistema' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (error) {
          this.logger.error('Database health check failed', error);
          return { database: { status: 'down' } };
        }
      },
      async (): Promise<HealthIndicatorResult> => {
        const healthy = await this.redis.isHealthy();
        return { redis: { status: healthy ? 'up' : 'down' } };
      },
    ]);
  }

  @Get('operational')
  @ApiOperation({
    summary:
      'Termómetro operativo y signos vitales del core de citas y waitlist',
  })
  async operational(): Promise<OperationalVitalSigns> {
    return this.operationalHealth.getVitalSigns();
  }
}
