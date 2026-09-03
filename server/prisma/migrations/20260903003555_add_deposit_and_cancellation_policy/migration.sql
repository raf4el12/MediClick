-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "depositAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Clinics" ADD COLUMN     "defaultCancellationWindowHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "noShowPenaltyPercentage" DECIMAL(5,2) NOT NULL DEFAULT 100.00;

-- AlterTable
ALTER TABLE "Specialties" ADD COLUMN     "cancellationWindowHours" INTEGER DEFAULT 24,
ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "depositPercentage" DECIMAL(5,2);
