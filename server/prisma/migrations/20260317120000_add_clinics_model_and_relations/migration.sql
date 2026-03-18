-- CreateTable
CREATE TABLE "Clinics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Clinics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinics_email_key" ON "Clinics"("email");

-- CreateIndex
CREATE INDEX "Clinics_isActive_deleted_idx" ON "Clinics"("isActive", "deleted");

-- Seed: Sede por defecto
INSERT INTO "Clinics" ("name", "timezone", "currency") VALUES ('Sede Principal', 'America/Lima', 'PEN');

-- AlterTable: agregar clinicId nullable a Doctors
ALTER TABLE "Doctors" ADD COLUMN "clinicId" INTEGER;

-- CreateIndex
CREATE INDEX "Doctors_clinicId_idx" ON "Doctors"("clinicId");

-- Backfill: asignar todos los doctores existentes a la Sede Principal
UPDATE "Doctors" SET "clinicId" = (SELECT id FROM "Clinics" WHERE name = 'Sede Principal' LIMIT 1) WHERE "clinicId" IS NULL;

-- AddForeignKey
ALTER TABLE "Doctors" ADD CONSTRAINT "Doctors_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: agregar clinicId nullable a Holidays
ALTER TABLE "Holidays" ADD COLUMN "clinicId" INTEGER;

-- DropIndex (viejo unique sin clinicId)
DROP INDEX "Holidays_date_name_key";

-- CreateIndex (nuevo unique con clinicId)
CREATE UNIQUE INDEX "Holidays_date_name_clinicId_key" ON "Holidays"("date", "name", "clinicId");

-- CreateIndex
CREATE INDEX "Holidays_clinicId_idx" ON "Holidays"("clinicId");

-- AddForeignKey
ALTER TABLE "Holidays" ADD CONSTRAINT "Holidays_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
