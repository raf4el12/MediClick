-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('T24', 'T2');

-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "isAtRisk" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppointmentReminders" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',

    CONSTRAINT "AppointmentReminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentReminders_appointmentId_idx" ON "AppointmentReminders"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReminders_appointmentId_kind_key" ON "AppointmentReminders"("appointmentId", "kind");

-- AddForeignKey
ALTER TABLE "AppointmentReminders" ADD CONSTRAINT "AppointmentReminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
