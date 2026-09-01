import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  durableEventName,
  type DurableDomainEvent,
} from '../domain/durable-domain-event.js';
import {
  PrismaOutboxRepository,
  type ClaimedOutboxEvent,
} from '../infrastructure/prisma-outbox.repository.js';

export const OUTBOX_WORKER_OPTIONS = Symbol('OUTBOX_WORKER_OPTIONS');

export interface OutboxWorkerOptions {
  enabled: boolean;
  batchSize: number;
  leaseMs: number;
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}

export class UnknownDurableEventError extends Error {
  constructor(type: string, schemaVersion: number) {
    super(`No existe handler para ${type} v${schemaVersion}`);
    this.name = UnknownDurableEventError.name;
  }
}

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly owner = randomUUID();
  private running = false;

  constructor(
    private readonly repository: PrismaOutboxRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(OUTBOX_WORKER_OPTIONS)
    private readonly options: OutboxWorkerOptions,
  ) {}

  @Interval('transactional-outbox', 2000)
  async poll(): Promise<void> {
    if (!this.options.enabled) return;
    await this.processBatch();
  }

  async processBatch(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;

    try {
      const claimed = await this.repository.claimBatch(
        this.owner,
        now,
        this.options.batchSize,
        this.options.leaseMs,
      );
      await Promise.all(claimed.map((event) => this.processEvent(event)));
      return claimed.length;
    } finally {
      this.running = false;
    }
  }

  private async processEvent(event: ClaimedOutboxEvent): Promise<void> {
    const eventName = durableEventName(event.type, event.schemaVersion);
    try {
      if (this.eventEmitter.listenerCount(eventName) === 0) {
        throw new UnknownDurableEventError(event.type, event.schemaVersion);
      }
      await this.eventEmitter.emitAsync(eventName, this.toEnvelope(event));

      const acknowledged = await this.repository.ack(
        event.eventId,
        this.owner,
        new Date(),
      );
      if (!acknowledged) {
        this.logger.warn(`Lease perdido al confirmar eventId=${event.eventId}`);
      }
    } catch (error) {
      const now = new Date();
      const result = await this.repository.reschedule(
        event.eventId,
        this.owner,
        now,
        event.attempts,
        redactError(error),
        {
          maxAttempts: this.options.maxAttempts,
          delayMs: this.backoffMs(event.attempts),
        },
      );
      if (result === 'dead-lettered') {
        this.logger.error(`Evento durable en dead letter: ${event.eventId}`);
      } else if (result === 'lease-lost') {
        this.logger.warn(
          `Lease perdido al reprogramar eventId=${event.eventId}`,
        );
      }
    }
  }

  private toEnvelope(event: ClaimedOutboxEvent): DurableDomainEvent {
    return {
      eventId: event.eventId,
      type: event.type,
      schemaVersion: event.schemaVersion,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      operationId: event.operationId,
      clinicId: event.clinicId,
      occurredAt: event.occurredAt,
      payload: event.payload,
    };
  }

  private backoffMs(attempts: number): number {
    const exponential =
      this.options.baseBackoffMs * Math.pow(2, Math.max(0, attempts - 1));
    return Math.min(exponential, this.options.maxBackoffMs);
  }
}

function redactError(error: unknown): string {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const message = error instanceof Error ? error.message : String(error);
  return `${name}: ${message}`
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(
      /(token|secret|signature|password)\s*[=:]\s*\S+/gi,
      '$1=[redacted]',
    )
    .slice(0, 500);
}
