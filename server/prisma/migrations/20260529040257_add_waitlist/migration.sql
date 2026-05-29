-- CreateEnum
CREATE TYPE "WaitlistTimePreference" AS ENUM ('ANY', 'MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "WaitlistEntryStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WaitlistOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "WaitlistEntries" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "specialtyId" INTEGER NOT NULL,
    "doctorId" INTEGER,
    "clinicId" INTEGER,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "timePreference" "WaitlistTimePreference" NOT NULL DEFAULT 'ANY',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "waitUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistEntries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistOffers" (
    "id" SERIAL NOT NULL,
    "waitlistEntryId" INTEGER NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistOfferStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAppointmentId" INTEGER,
    "clinicId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistOffers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistEntries_clinicId_specialtyId_status_idx" ON "WaitlistEntries"("clinicId", "specialtyId", "status");

-- CreateIndex
CREATE INDEX "WaitlistEntries_clinicId_doctorId_status_idx" ON "WaitlistEntries"("clinicId", "doctorId", "status");

-- CreateIndex
CREATE INDEX "WaitlistEntries_status_priority_createdAt_idx" ON "WaitlistEntries"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntries_status_waitUntil_idx" ON "WaitlistEntries"("status", "waitUntil");

-- CreateIndex
CREATE INDEX "WaitlistEntries_patientId_status_idx" ON "WaitlistEntries"("patientId", "status");

-- CreateIndex
CREATE INDEX "WaitlistOffers_waitlistEntryId_status_idx" ON "WaitlistOffers"("waitlistEntryId", "status");

-- CreateIndex
CREATE INDEX "WaitlistOffers_status_expiresAt_idx" ON "WaitlistOffers"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "WaitlistOffers_scheduleId_startTime_endTime_idx" ON "WaitlistOffers"("scheduleId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffers" ADD CONSTRAINT "WaitlistOffers_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffers" ADD CONSTRAINT "WaitlistOffers_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffers" ADD CONSTRAINT "WaitlistOffers_createdAppointmentId_fkey" FOREIGN KEY ("createdAppointmentId") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffers" ADD CONSTRAINT "WaitlistOffers_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
