/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Categories` table. All the data in the column will be lost.
  - Made the column `duration` on table `Specialties` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Transactions" DROP CONSTRAINT "Transactions_appointmentId_fkey";

-- DropIndex
DROP INDEX "Users_email_idx";

-- AlterTable
ALTER TABLE "Categories" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Specialties" ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "duration" SET DEFAULT 30;

-- AlterTable
ALTER TABLE "Users" ALTER COLUMN "role" SET DEFAULT 'PATIENT';

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
