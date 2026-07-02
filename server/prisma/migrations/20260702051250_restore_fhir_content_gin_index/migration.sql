-- CreateIndex
CREATE INDEX "idx_fhir_resource_content_gin" ON "FhirResource" USING GIN ("content" jsonb_path_ops);
