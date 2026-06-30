-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_FAILED', 'PERMISSION_DENIED');

-- CreateTable
CREATE TABLE "SecurityAuditLogs" (
    "id" SERIAL NOT NULL,
    "eventType" "SecurityEventType" NOT NULL,
    "userId" INTEGER,
    "email" TEXT,
    "clinicId" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "resource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityAuditLogs_eventType_createdAt_idx" ON "SecurityAuditLogs"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLogs_userId_idx" ON "SecurityAuditLogs"("userId");

-- CreateIndex
CREATE INDEX "SecurityAuditLogs_email_idx" ON "SecurityAuditLogs"("email");
