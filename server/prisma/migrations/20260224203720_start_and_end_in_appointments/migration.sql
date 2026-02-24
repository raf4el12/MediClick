/*
  Warnings:

  - Added the required column `endTime` to the `Appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Appointments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Appointments_scheduleId_idx";

-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Availability" ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Appointments_scheduleId_startTime_endTime_idx" ON "Appointments"("scheduleId", "startTime", "endTime");
