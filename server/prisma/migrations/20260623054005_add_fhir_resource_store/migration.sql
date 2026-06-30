-- CreateTable
CREATE TABLE "FhirResource" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "versionId" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FhirResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FhirResourceHistory" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "versionId" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FhirResourceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FhirResource_resourceType_clinicId_idx" ON "FhirResource"("resourceType", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirResource_resourceType_id_key" ON "FhirResource"("resourceType", "id");

-- CreateIndex
CREATE INDEX "FhirResourceHistory_resourceType_resourceId_versionId_idx" ON "FhirResourceHistory"("resourceType", "resourceId", "versionId");

-- Índice GIN para search params FHIR sobre el documento jsonb
CREATE INDEX "idx_fhir_resource_content_gin"
  ON "FhirResource" USING GIN (content jsonb_path_ops);
