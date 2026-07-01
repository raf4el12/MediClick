import type { Resource } from '@medplum/fhirtypes';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';

export function toEntity(raw: any): FhirResourceEntity {
  return {
    id: raw.id,
    resourceType: raw.resourceType,
    versionId: raw.versionId,
    content: raw.content as Resource,
    clinicId: raw.clinicId,
    deleted: raw.deleted,
    lastUpdated: raw.lastUpdated,
    createdAt: raw.createdAt,
  };
}

export function toVersion(raw: any): FhirResourceVersion {
  return {
    resourceType: raw.resourceType,
    resourceId: raw.resourceId,
    versionId: raw.versionId,
    content: raw.content as Resource,
    recordedAt: raw.recordedAt,
  };
}
