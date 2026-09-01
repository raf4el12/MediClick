import { Global, Module } from '@nestjs/common';
import {
  OutboxWorker,
  OUTBOX_WORKER_OPTIONS,
} from './application/outbox-worker.js';
import { PrismaOutboxRepository } from './infrastructure/prisma-outbox.repository.js';

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Global()
@Module({
  providers: [
    PrismaOutboxRepository,
    {
      provide: OUTBOX_WORKER_OPTIONS,
      useFactory: () => ({
        enabled: process.env.OUTBOX_WORKER_ENABLED !== 'false',
        batchSize: positiveInteger(process.env.OUTBOX_BATCH_SIZE, 25),
        leaseMs: positiveInteger(process.env.OUTBOX_LEASE_MS, 30_000),
        maxAttempts: positiveInteger(process.env.OUTBOX_MAX_ATTEMPTS, 8),
        baseBackoffMs: positiveInteger(
          process.env.OUTBOX_BASE_BACKOFF_MS,
          1000,
        ),
        maxBackoffMs: positiveInteger(
          process.env.OUTBOX_MAX_BACKOFF_MS,
          300_000,
        ),
      }),
    },
    OutboxWorker,
  ],
  exports: [PrismaOutboxRepository, OutboxWorker],
})
export class OutboxModule {}
