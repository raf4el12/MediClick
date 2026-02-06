import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  ICategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from '../../domain/repositories/category.repository.js';
import { CategoryEntity } from '../../domain/entities/category.entity.js';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    return this.prisma.categories.create({ data });
  }

  async findAll(): Promise<CategoryEntity[]> {
    return this.prisma.categories.findMany({
      where: { deleted: false },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: number): Promise<CategoryEntity | null> {
    return this.prisma.categories.findFirst({
      where: { id, deleted: false },
    });
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.categories.count({
      where: { name, deleted: false },
    });
    return count > 0;
  }

  async existsByNameExcluding(
    name: string,
    excludeId: number,
  ): Promise<boolean> {
    const count = await this.prisma.categories.count({
      where: { name, deleted: false, id: { not: excludeId } },
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
      data: { deleted: true, deletedAt: new Date(), updatedAt: new Date() },
    });
  }
}
