-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "cancellationFee" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Specialties" ADD COLUMN     "bufferMinutes" INTEGER DEFAULT 0;
