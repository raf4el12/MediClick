import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ICategoryRepository } from '../../domain/repositories/category.repository.js';
import {
  CreateCategoryData,
  UpdateCategoryData,
} from '../../domain/interfaces/category-data.interface.js';
import { CategoryEntity } from '../../domain/entities/category.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    return this.prisma.categories.create({ data });
  }

  async findAllPaginated(
    params: PaginationParams,
    clinicId?: number,
  ): Promise<PaginatedResult<CategoryEntity>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where = {
      deleted: false,
      ...(clinicId ? { OR: [{ clinicId: null }, { clinicId }] } : {}),
      ...(searchValue && {
        AND: [
          {
            OR: [
              {
                name: {
                  contains: searchValue,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: searchValue,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        ],
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.categories.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'name']: orderByMode || 'desc' },
      }),
      this.prisma.categories.count({ where }),
    ]);

    return {
      totalRows: count,
      rows,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<CategoryEntity | null> {
    return this.prisma.categories.findFirst({
      where: { id, deleted: false },
    });
  }

  async existsByName(name: string, clinicId?: number | null): Promise<boolean> {
    const count = await this.prisma.categories.count({
      where: {
        name,
        deleted: false,
        clinicId: clinicId ?? null,
      },
    });
    return count > 0;
  }

  async existsByNameExcluding(
    name: string,
    excludeId: number,
    clinicId?: number | null,
  ): Promise<boolean> {
    const count = await this.prisma.categories.count({
      where: {
        name,
        deleted: false,
        id: { not: excludeId },
        clinicId: clinicId ?? null,
      },
    });
    return count > 0;
  }

  async update(id: number, data: UpdateCategoryData): Promise<CategoryEntity> {
    return this.prisma.categories.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.categories.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }
}
