-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "pendingUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payerEmail" TEXT,
ADD COLUMN     "preferenceId" TEXT,
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Appointments_status_pendingUntil_idx" ON "Appointments"("status", "pendingUntil");

-- CreateIndex
CREATE INDEX "Transactions_preferenceId_idx" ON "Transactions"("preferenceId");

-- CreateIndex
CREATE INDEX "Transactions_externalRef_idx" ON "Transactions"("externalRef");
