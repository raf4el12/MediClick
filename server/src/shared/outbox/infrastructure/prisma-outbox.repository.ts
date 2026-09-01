import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { DurableDomainEvent } from '../domain/durable-domain-event.js';

export interface ClaimedOutboxEvent extends DurableDomainEvent {
  dedupeKey: string;
  attempts: number;
  lockedUntil: Date;
}

interface ClaimedRow {
  eventId: string;
  type: string;
  schemaVersion: number;
  aggregateType: string;
  aggregateId: string;
  operationId: string;
  clinicId: number | null;
  payload: Prisma.JsonValue;
  dedupeKey: string;
  occurredAt: Date;
  attempts: number;
  lockedUntil: Date;
}

export interface RescheduleOptions {
  maxAttempts: number;
  delayMs: number;
}

@Injectable()
export class PrismaOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claimBatch(
    owner: string,
    now: Date,
    limit: number,
    leaseMs: number,
  ): Promise<ClaimedOutboxEvent[]> {
    if (limit <= 0) return [];
    const lockedUntil = new Date(now.getTime() + leaseMs);

    const rows = await this.prisma.$transaction((tx) =>
      tx.$queryRaw<ClaimedRow[]>(Prisma.sql`
        WITH candidates AS (
          SELECT "eventId"
          FROM "OutboxEvents"
          WHERE "publishedAt" IS NULL
            AND "deadLetteredAt" IS NULL
            AND "availableAt" <= ${now}
            AND ("lockedUntil" IS NULL OR "lockedUntil" < ${now})
          ORDER BY "occurredAt", "eventId"
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        )
        UPDATE "OutboxEvents" AS event
        SET "lockedBy" = ${owner},
            "lockedUntil" = ${lockedUntil},
            "attempts" = event."attempts" + 1
        FROM candidates
        WHERE event."eventId" = candidates."eventId"
        RETURNING event."eventId", event."type", event."schemaVersion",
          event."aggregateType", event."aggregateId", event."operationId",
          event."clinicId", event."payload", event."dedupeKey",
          event."occurredAt", event."attempts", event."lockedUntil"
      `),
    );

    return rows.map((row) => ({
      eventId: row.eventId,
      type: row.type,
      schemaVersion: row.schemaVersion,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      operationId: row.operationId,
      clinicId: row.clinicId,
      occurredAt: row.occurredAt.toISOString(),
      payload: row.payload as DurableDomainEvent['payload'],
      dedupeKey: row.dedupeKey,
      attempts: row.attempts,
      lockedUntil: row.lockedUntil,
    }));
  }

  async ack(eventId: string, owner: string, now: Date): Promise<boolean> {
    const result = await this.prisma.outboxEvents.updateMany({
      where: {
        eventId,
        lockedBy: owner,
        lockedUntil: { gte: now },
        publishedAt: null,
        deadLetteredAt: null,
      },
      data: {
        publishedAt: now,
        lockedBy: null,
        lockedUntil: null,
        lastError: null,
      },
    });
    return result.count === 1;
  }

  async reschedule(
    eventId: string,
    owner: string,
    now: Date,
    attempts: number,
    error: string,
    options: RescheduleOptions,
  ): Promise<'rescheduled' | 'dead-lettered' | 'lease-lost'> {
    const deadLettered = attempts >= options.maxAttempts;
    const result = await this.prisma.outboxEvents.updateMany({
      where: {
        eventId,
        lockedBy: owner,
        lockedUntil: { gte: now },
        publishedAt: null,
        deadLetteredAt: null,
      },
      data: {
        lastError: error,
        lockedBy: null,
        lockedUntil: null,
        ...(deadLettered
          ? { deadLetteredAt: now }
          : { availableAt: new Date(now.getTime() + options.delayMs) }),
      },
    });

    if (result.count === 0) return 'lease-lost';
    return deadLettered ? 'dead-lettered' : 'rescheduled';
  }

  async replay(eventId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.outboxEvents.updateMany({
      where: { eventId, publishedAt: null, deadLetteredAt: { not: null } },
      data: {
        deadLetteredAt: null,
        availableAt: now,
        attempts: 0,
        lastError: null,
        lockedBy: null,
        lockedUntil: null,
      },
    });
    return result.count === 1;
  }
}
