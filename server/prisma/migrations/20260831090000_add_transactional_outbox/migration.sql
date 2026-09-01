CREATE TABLE "OutboxEvents" (
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "clinicId" INTEGER,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedBy" TEXT,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "OutboxEvents_pkey" PRIMARY KEY ("eventId")
);

CREATE TABLE "OutboxConsumptions" (
    "id" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxConsumptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvents_dedupeKey_key" ON "OutboxEvents"("dedupeKey");
CREATE INDEX "OutboxEvents_publishedAt_availableAt_idx" ON "OutboxEvents"("publishedAt", "availableAt");
CREATE INDEX "OutboxEvents_deadLetteredAt_lockedUntil_idx" ON "OutboxEvents"("deadLetteredAt", "lockedUntil");
CREATE INDEX "OutboxEvents_clinicId_occurredAt_idx" ON "OutboxEvents"("clinicId", "occurredAt");

-- Índice de hot path: solo filas pendientes, ordenadas como las reclama el worker.
CREATE INDEX "OutboxEvents_claim_pending_idx"
ON "OutboxEvents"("availableAt", "occurredAt")
WHERE "publishedAt" IS NULL AND "deadLetteredAt" IS NULL;

CREATE UNIQUE INDEX "OutboxConsumptions_consumerName_eventId_key"
ON "OutboxConsumptions"("consumerName", "eventId");
CREATE INDEX "OutboxConsumptions_eventId_idx" ON "OutboxConsumptions"("eventId");
