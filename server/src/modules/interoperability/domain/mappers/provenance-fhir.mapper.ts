import type { Provenance } from '@medplum/fhirtypes';

export interface ProvenanceInput {
  targetType: string;
  targetFhirId: string;
  eventName: string;
  internalId: number;
  recordedAt: Date;
}

export function buildProvenance(input: ProvenanceInput): Provenance {
  return {
    resourceType: 'Provenance',
    target: [{ reference: `${input.targetType}/${input.targetFhirId}` }],
    recorded: input.recordedAt.toISOString(),
    activity: { text: input.eventName },
    agent: [{ who: { display: 'MediClick' } }],
    entity: [
      {
        role: 'source',
        what: { display: `${input.targetType} interno id=${input.internalId}` },
      },
    ],
  };
}
