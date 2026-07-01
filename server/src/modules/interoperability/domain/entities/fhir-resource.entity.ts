import type { Resource } from '@medplum/fhirtypes';

/** Estado actual de un recurso FHIR en el store (proyección). */
export interface FhirResourceEntity {
  id: string;
  resourceType: string;
  versionId: number;
  content: Resource;
  clinicId: number;
  deleted: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

/** Una versión histórica (append-only) de un recurso. */
export interface FhirResourceVersion {
  resourceType: string;
  resourceId: string;
  versionId: number;
  content: Resource;
  recordedAt: Date;
}
