-- CreateEnum
CREATE TYPE "ReminderDeliveryStatus" AS ENUM ('PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "AppointmentReminders" ADD COLUMN "scheduledFor" TIMESTAMP(3),
ADD COLUMN "status" "ReminderDeliveryStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "claimToken" TEXT,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3);

ALTER TABLE "AppointmentReminders" ALTER COLUMN "sentAt" DROP NOT NULL;
ALTER TABLE "AppointmentReminders" ALTER COLUMN "sentAt" DROP DEFAULT;

-- Backfill existing scheduledFor from appointment scheduleDate + startTime + clinic timezone (or fallback America/Lima)
UPDATE "AppointmentReminders" ar
SET "scheduledFor" = (
  SELECT (s."scheduleDate"::date + a."startTime"::time) AT TIME ZONE COALESCE(c."timezone", 'America/Lima') AT TIME ZONE 'UTC'
  FROM "Appointments" a
  JOIN "Schedules" s ON s."id" = a."scheduleId"
  LEFT JOIN "Clinics" c ON c."id" = a."clinicId"
  WHERE a."id" = ar."appointmentId"
),
"status" = 'SENT'
WHERE ar."scheduledFor" IS NULL;

-- Fallback for any orphaned rows
UPDATE "AppointmentReminders"
SET "scheduledFor" = CURRENT_TIMESTAMP, "status" = 'SENT'
WHERE "scheduledFor" IS NULL;

-- Make scheduledFor NOT NULL
ALTER TABLE "AppointmentReminders" ALTER COLUMN "scheduledFor" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "AppointmentReminders_appointmentId_kind_key";

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReminders_appointmentId_kind_channel_scheduledFor_key" ON "AppointmentReminders"("appointmentId", "kind", "channel", "scheduledFor");

-- CreateIndex
CREATE INDEX "AppointmentReminders_status_nextAttemptAt_idx" ON "AppointmentReminders"("status", "nextAttemptAt");
