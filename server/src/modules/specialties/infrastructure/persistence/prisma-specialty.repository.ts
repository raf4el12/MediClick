import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  ISpecialtyRepository,
  CreateSpecialtyData,
  UpdateSpecialtyData,
  SpecialtyWithCategory,
} from '../../domain/repositories/specialty.repository.js';
import { SpecialtyEntity } from '../../domain/entities/specialty.entity.js';

const categorySelect = { select: { id: true, name: true } } as const;

@Injectable()
export class PrismaSpecialtyRepository implements ISpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSpecialtyData): Promise<SpecialtyWithCategory> {
    return this.prisma.specialties.create({
      data,
      include: { category: categorySelect },
    });
  }

  async findAll(): Promise<SpecialtyWithCategory[]> {
    return this.prisma.specialties.findMany({
      where: { deleted: false },
      include: { category: categorySelect },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number): Promise<SpecialtyWithCategory | null> {
    return this.prisma.specialties.findFirst({
      where: { id, deleted: false },
      include: { category: categorySelect },
    });
  }

  async findByIds(ids: number[]): Promise<SpecialtyEntity[]> {
    return this.prisma.specialties.findMany({
      where: { id: { in: ids }, deleted: false },
    });
  }

  async update(
    id: number,
    data: UpdateSpecialtyData,
  ): Promise<SpecialtyWithCategory> {
    return this.prisma.specialties.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { category: categorySelect },
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.specialties.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }
}
