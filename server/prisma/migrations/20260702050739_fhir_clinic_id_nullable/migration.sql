-- DropIndex
DROP INDEX "idx_fhir_resource_content_gin";

-- AlterTable
ALTER TABLE "FhirResource" ALTER COLUMN "clinicId" DROP NOT NULL;
