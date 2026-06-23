import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';
import type {
  IFhirResourceRepository,
  SaveFhirResourceInput,
} from '../../domain/repositories/fhir-resource.repository.js';
import {
  nextVersionId,
  stampResource,
} from '../../domain/fhir-resource.logic.js';

@Injectable()
export class FhirResourceService {
  constructor(
    @Inject('IFhirResourceRepository')
    private readonly repo: IFhirResourceRepository,
  ) {}

  async save(input: SaveFhirResourceInput): Promise<FhirResourceEntity> {
    const id = input.id ?? randomUUID();
    const existing = await this.repo.findByTypeAndId(input.resourceType, id);
    const versionId = nextVersionId(existing);
    const lastUpdated = new Date();
    const content = stampResource(input.content, { id, versionId, lastUpdated });

    return this.repo.persist({
      id,
      resourceType: input.resourceType,
      versionId,
      content,
      clinicId: input.clinicId,
      lastUpdated,
    });
  }

  getById(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceEntity | null> {
    return this.repo.findByTypeAndId(resourceType, id);
  }

  getHistory(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceVersion[]> {
    return this.repo.findHistory(resourceType, id);
  }
}
