-- CreateEnum
CREATE TYPE "MedicalHistoryStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CHRONIC');

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "description" TEXT,
    "diagnosedDate" TIMESTAMP(3),
    "status" "MedicalHistoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalHistory_patientId_status_idx" ON "MedicalHistory"("patientId", "status");

-- CreateIndex
CREATE INDEX "MedicalHistory_patientId_createdAt_idx" ON "MedicalHistory"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
