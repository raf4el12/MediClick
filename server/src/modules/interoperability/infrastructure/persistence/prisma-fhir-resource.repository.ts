import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';
import type {
  IFhirResourceRepository,
  PersistFhirResourceInput,
} from '../../domain/repositories/fhir-resource.repository.js';
import { toEntity, toVersion } from './fhir-resource.mapper.js';

@Injectable()
export class PrismaFhirResourceRepository implements IFhirResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async persist(input: PersistFhirResourceInput): Promise<FhirResourceEntity> {
    const content = input.content as unknown as Prisma.InputJsonValue;
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.fhirResource.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          resourceType: input.resourceType,
          versionId: input.versionId,
          content,
          clinicId: input.clinicId,
          lastUpdated: input.lastUpdated,
        },
        update: {
          versionId: input.versionId,
          content,
          lastUpdated: input.lastUpdated,
          deleted: false,
        },
      });
      await tx.fhirResourceHistory.create({
        data: {
          resourceType: input.resourceType,
          resourceId: input.id,
          versionId: input.versionId,
          content,
        },
      });
      return row;
    });
    return toEntity(saved);
  }

  async findByTypeAndId(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceEntity | null> {
    const row = await this.prisma.fhirResource.findFirst({
      where: { resourceType, id, deleted: false },
    });
    return row ? toEntity(row) : null;
  }

  async findHistory(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceVersion[]> {
    const rows = await this.prisma.fhirResourceHistory.findMany({
      where: { resourceType, resourceId: id },
      orderBy: { versionId: 'desc' },
    });
    return rows.map(toVersion);
  }

  async softDelete(resourceType: string, id: string): Promise<void> {
    await this.prisma.fhirResource.updateMany({
      where: { resourceType, id },
      data: { deleted: true },
    });
  }
}
