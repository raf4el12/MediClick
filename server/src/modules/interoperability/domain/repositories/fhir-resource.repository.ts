import type { Resource } from '@medplum/fhirtypes';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../entities/fhir-resource.entity.js';

/** Entrada del caso de uso "guardar": el servicio resuelve id/version/meta. */
export interface SaveFhirResourceInput {
  /** Omitir para crear (se genera UUID); proveer para actualizar. */
  id?: string;
  resourceType: string;
  content: Resource;
  clinicId: number | null;
}

/** Entrada ya resuelta que el repositorio persiste de forma atómica. */
export interface PersistFhirResourceInput {
  id: string;
  resourceType: string;
  versionId: number;
  content: Resource;
  clinicId: number | null;
  lastUpdated: Date;
}

export interface ApplyFhirProjectionInput {
  consumerName: string;
  eventId: string;
  occurredAt: Date;
  upserts: Array<SaveFhirResourceInput & { id: string }>;
  deletes?: Array<{ resourceType: string; id: string }>;
}

export type ApplyFhirProjectionResult = 'applied' | 'duplicate';

export interface IFhirResourceRepository {
  /** Upsert del recurso + append de su versión al historial, en una transacción. */
  persist(input: PersistFhirResourceInput): Promise<FhirResourceEntity>;
  findByTypeAndId(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceEntity | null>;
  /** Versiones del recurso, más nueva primero. */
  findHistory(resourceType: string, id: string): Promise<FhirResourceVersion[]>;
  softDelete(resourceType: string, id: string): Promise<void>;
  /** Aplica recibo, recursos e historial como una única proyección idempotente. */
  applyProjection(
    input: ApplyFhirProjectionInput,
  ): Promise<ApplyFhirProjectionResult>;
}
