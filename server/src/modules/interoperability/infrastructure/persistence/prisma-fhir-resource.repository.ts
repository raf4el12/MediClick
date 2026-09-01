import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';
import type {
  ApplyFhirProjectionInput,
  ApplyFhirProjectionResult,
  IFhirResourceRepository,
  PersistFhirResourceInput,
} from '../../domain/repositories/fhir-resource.repository.js';
import {
  nextVersionId,
  stampResource,
} from '../../domain/fhir-resource.logic.js';
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

  async applyProjection(
    input: ApplyFhirProjectionInput,
  ): Promise<ApplyFhirProjectionResult> {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.outboxConsumptions.createMany({
        data: {
          consumerName: input.consumerName,
          eventId: input.eventId,
        },
        skipDuplicates: true,
      });
      if (receipt.count === 0) return 'duplicate';

      const resourceKeys = [
        ...input.upserts.map(
          (resource) => `${resource.resourceType}:${resource.id}`,
        ),
        ...(input.deletes ?? []).map(
          (resource) => `${resource.resourceType}:${resource.id}`,
        ),
      ].sort();

      for (const key of new Set(resourceKeys)) {
        await tx.$queryRaw<Array<{ locked: number }>>`
          SELECT 1 AS locked
          FROM (SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))) AS resource_lock
        `;
      }

      for (const resource of input.upserts) {
        const existing = await tx.fhirResource.findUnique({
          where: { id: resource.id },
        });
        if (existing && existing.resourceType !== resource.resourceType) {
          throw new Error(
            `FHIR id ${resource.id} ya pertenece a ${existing.resourceType}`,
          );
        }

        const versionId = nextVersionId(existing);
        const content = stampResource(resource.content, {
          id: resource.id,
          versionId,
          lastUpdated: input.occurredAt,
        }) as unknown as Prisma.InputJsonValue;

        await tx.fhirResource.upsert({
          where: { id: resource.id },
          create: {
            id: resource.id,
            resourceType: resource.resourceType,
            versionId,
            content,
            clinicId: resource.clinicId,
            lastUpdated: input.occurredAt,
          },
          update: {
            versionId,
            content,
            clinicId: resource.clinicId,
            lastUpdated: input.occurredAt,
            deleted: false,
          },
        });
        await tx.fhirResourceHistory.create({
          data: {
            resourceType: resource.resourceType,
            resourceId: resource.id,
            versionId,
            content,
          },
        });
      }

      for (const resource of input.deletes ?? []) {
        await tx.fhirResource.updateMany({
          where: {
            id: resource.id,
            resourceType: resource.resourceType,
          },
          data: { deleted: true },
        });
      }

      return 'applied';
    });
  }
}
