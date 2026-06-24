import type { Resource } from '@medplum/fhirtypes';

/** Siguiente número de versión: 1 si es nuevo, +1 sobre el existente. */
export function nextVersionId(existing: { versionId: number } | null): number {
  return existing ? existing.versionId + 1 : 1;
}

/**
 * Sella en el recurso los datos gestionados por el servidor: id lógico y
 * meta.versionId / meta.lastUpdated. No muta el recurso original.
 */
export function stampResource(
  content: Resource,
  params: { id: string; versionId: number; lastUpdated: Date },
): Resource {
  return {
    ...content,
    id: params.id,
    meta: {
      ...content.meta,
      versionId: String(params.versionId),
      lastUpdated: params.lastUpdated.toISOString(),
    },
  };
}
