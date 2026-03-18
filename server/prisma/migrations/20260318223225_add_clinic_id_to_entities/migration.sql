-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Categories" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Schedules" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Specialties" ADD COLUMN     "clinicId" INTEGER;

-- CreateIndex
CREATE INDEX "Appointments_clinicId_idx" ON "Appointments"("clinicId");

-- CreateIndex
CREATE INDEX "Availability_clinicId_idx" ON "Availability"("clinicId");

-- CreateIndex
CREATE INDEX "Categories_clinicId_idx" ON "Categories"("clinicId");

-- CreateIndex
CREATE INDEX "Schedules_clinicId_idx" ON "Schedules"("clinicId");

-- CreateIndex
CREATE INDEX "Specialties_clinicId_idx" ON "Specialties"("clinicId");

-- AddForeignKey
ALTER TABLE "Specialties" ADD CONSTRAINT "Specialties_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedules" ADD CONSTRAINT "Schedules_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: Schedules heredan clinicId del doctor
UPDATE "Schedules" s SET "clinicId" = d."clinicId"
FROM "Doctors" d WHERE s."doctorId" = d.id AND s."clinicId" IS NULL AND d."clinicId" IS NOT NULL;

-- Backfill: Availability hereda clinicId del doctor
UPDATE "Availability" a SET "clinicId" = d."clinicId"
FROM "Doctors" d WHERE a."doctorId" = d.id AND a."clinicId" IS NULL AND d."clinicId" IS NOT NULL;

-- Backfill: Appointments heredan clinicId del schedule→doctor
UPDATE "Appointments" ap SET "clinicId" = d."clinicId"
FROM "Schedules" s JOIN "Doctors" d ON s."doctorId" = d.id
WHERE ap."scheduleId" = s.id AND ap."clinicId" IS NULL AND d."clinicId" IS NOT NULL;
