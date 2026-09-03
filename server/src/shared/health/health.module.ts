import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { OperationalHealthService } from './operational-health.service.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [OperationalHealthService],
  exports: [OperationalHealthService],
})
export class HealthModule {}
