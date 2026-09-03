import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service.js';
import { JobLeaseService } from './job-lease.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, JobLeaseService],
  exports: [RedisService, JobLeaseService],
})
export class RedisModule {}
