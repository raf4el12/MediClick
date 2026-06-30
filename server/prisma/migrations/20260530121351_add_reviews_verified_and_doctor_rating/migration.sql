-- DropIndex
DROP INDEX "Reviews_doctorId_idx";

-- AlterTable
ALTER TABLE "Doctors" ADD COLUMN     "ratingAvg" DECIMAL(3,2),
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN     "appointmentId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reviews_appointmentId_key" ON "Reviews"("appointmentId");

-- CreateIndex
CREATE INDEX "Reviews_doctorId_isVisible_idx" ON "Reviews"("doctorId", "isVisible");

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
