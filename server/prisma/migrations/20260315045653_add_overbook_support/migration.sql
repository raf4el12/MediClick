-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "isOverbook" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Doctors" ADD COLUMN     "maxOverbookPerDay" INTEGER NOT NULL DEFAULT 2;
