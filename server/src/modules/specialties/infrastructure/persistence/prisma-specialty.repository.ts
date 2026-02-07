import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';
import {
  CreateSpecialtyData,
  UpdateSpecialtyData,
  SpecialtyWithCategory,
} from '../../domain/interfaces/specialty-data.interface.js';
import { SpecialtyEntity } from '../../domain/entities/specialty.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

const categorySelect = { select: { id: true, name: true } } as const;

@Injectable()
export class PrismaSpecialtyRepository implements ISpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSpecialtyData): Promise<SpecialtyWithCategory> {
    const result = await this.prisma.specialties.create({
      data,
      include: { category: categorySelect },
    });
    return { ...result, price: result.price ? Number(result.price) : null };
  }

  async findAllPaginated(
    params: PaginationParams,
    categoryId?: number,
  ): Promise<PaginatedResult<SpecialtyWithCategory>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where = {
      deleted: false,
      ...(categoryId && { categoryId }),
      ...(searchValue && {
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
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.specialties.findMany({
        where,
        include: { category: categorySelect },
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'name']: orderByMode || 'desc' },
      }),
      this.prisma.specialties.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows.map((r) => ({
        ...r,
        price: r.price ? Number(r.price) : null,
      })),
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<SpecialtyWithCategory | null> {
    const result = await this.prisma.specialties.findFirst({
      where: { id, deleted: false },
      include: { category: categorySelect },
    });
    if (!result) return null;
    return { ...result, price: result.price ? Number(result.price) : null };
  }

  async findByIds(ids: number[]): Promise<SpecialtyEntity[]> {
    const results = await this.prisma.specialties.findMany({
      where: { id: { in: ids }, deleted: false },
    });
    return results.map((r) => ({
      ...r,
      price: r.price ? Number(r.price) : null,
    }));
  }

  async update(
    id: number,
    data: UpdateSpecialtyData,
  ): Promise<SpecialtyWithCategory> {
    const result = await this.prisma.specialties.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { category: categorySelect },
    });
    return { ...result, price: result.price ? Number(result.price) : null };
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.specialties.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }
}
