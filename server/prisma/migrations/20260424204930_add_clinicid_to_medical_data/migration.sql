-- AlterTable
ALTER TABLE "ClinicalNotes" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "MedicalHistory" ADD COLUMN     "clinicId" INTEGER;

-- AlterTable
ALTER TABLE "Prescriptions" ADD COLUMN     "clinicId" INTEGER;

-- CreateIndex
CREATE INDEX "ClinicalNotes_clinicId_idx" ON "ClinicalNotes"("clinicId");

-- CreateIndex
CREATE INDEX "MedicalHistory_clinicId_idx" ON "MedicalHistory"("clinicId");

-- CreateIndex
CREATE INDEX "Prescriptions_clinicId_idx" ON "Prescriptions"("clinicId");

-- AddForeignKey
ALTER TABLE "ClinicalNotes" ADD CONSTRAINT "ClinicalNotes_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
