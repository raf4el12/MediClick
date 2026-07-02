import { createHash } from 'node:crypto';

/** Namespace UUID propio de MediClick para ids FHIR (fijo, no cambiar: cambiaría todos los ids). */
export const NAMESPACE_MEDICLICK = '7a5b6d3e-1c2f-4a8b-9d4e-0f1a2b3c4d5e';

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

/** UUID v5 (RFC 4122, SHA-1) sin dependencias externas. */
export function uuidV5(name: string, namespace: string): string {
  const hash = createHash('sha1')
    .update(uuidToBytes(namespace))
    .update(name, 'utf8')
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Id FHIR estable para una entidad interna: proyectarla N veces versiona el mismo recurso. */
export function fhirIdFor(resourceType: string, internalId: number): string {
  return uuidV5(`${resourceType}:${internalId}`, NAMESPACE_MEDICLICK);
}

/** Id estable del Provenance asociado a la proyección de una entidad. */
export function provenanceIdFor(
  targetType: string,
  internalId: number,
): string {
  return uuidV5(`Provenance:${targetType}:${internalId}`, NAMESPACE_MEDICLICK);
}
