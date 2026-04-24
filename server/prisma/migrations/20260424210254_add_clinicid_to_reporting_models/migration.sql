-- AlterTable
ALTER TABLE "Notifications" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "clinicId" INTEGER;

-- CreateIndex
CREATE INDEX "Notifications_clinicId_idx" ON "Notifications"("clinicId");

-- CreateIndex
CREATE INDEX "Reviews_clinicId_idx" ON "Reviews"("clinicId");

-- CreateIndex
CREATE INDEX "Transactions_clinicId_idx" ON "Transactions"("clinicId");

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
