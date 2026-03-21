-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PRESCRIPTION_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "clinicId" INTEGER;

-- CreateIndex
CREATE INDEX "Users_clinicId_idx" ON "Users"("clinicId");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
