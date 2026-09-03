/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { PrismaSpecialtyRepository } from './prisma-specialty.repository.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';

describe('PrismaSpecialtyRepository — cancellation policy inheritance', () => {
  let repository: PrismaSpecialtyRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      specialties: {
        create: jest.fn(),
      },
      tenant: {
        specialties: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
        },
      },
    };
    repository = new PrismaSpecialtyRepository(
      mockPrisma as unknown as PrismaService,
    );
  });

  it('RED->GREEN: preserva null en cancellationWindowHours (herencia de política de sede)', async () => {
    mockPrisma.tenant.specialties.findFirst.mockResolvedValue({
      id: 1,
      categoryId: 10,
      name: 'Cardiología',
      description: null,
      duration: 30,
      bufferMinutes: 0,
      price: '100.00',
      cancellationWindowHours: null,
      depositPercentage: null,
      depositAmount: null,
      requirements: null,
      icon: null,
      isActive: true,
      deleted: false,
      clinicId: 1,
      createdAt: new Date(),
      updatedAt: null,
      category: { id: 10, name: 'Medicina' },
    });

    const result = await repository.findById(1);

    expect(result).not.toBeNull();
    expect(result!.cancellationWindowHours).toBeNull();
  });

  it('preserva valor explícito no-nulo si la especialidad define su propia ventana', async () => {
    mockPrisma.tenant.specialties.findFirst.mockResolvedValue({
      id: 2,
      categoryId: 10,
      name: 'Cirugía',
      description: null,
      duration: 60,
      bufferMinutes: 0,
      price: '200.00',
      cancellationWindowHours: 12,
      depositPercentage: null,
      depositAmount: null,
      requirements: null,
      icon: null,
      isActive: true,
      deleted: false,
      clinicId: 1,
      createdAt: new Date(),
      updatedAt: null,
      category: { id: 10, name: 'Medicina' },
    });

    const result = await repository.findById(2);

    expect(result).not.toBeNull();
    expect(result!.cancellationWindowHours).toBe(12);
  });

  it('RED->GREEN: incluye especialidades globales junto con las de la sede solicitada', async () => {
    mockPrisma.tenant.specialties.findMany.mockResolvedValue([]);
    mockPrisma.tenant.specialties.count.mockResolvedValue(0);

    await repository.findAllPaginated({ limit: 10, offset: 0 }, undefined, 7);

    expect(mockPrisma.tenant.specialties.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ clinicId: null }, { clinicId: 7 }],
        }),
      }),
    );
  });
});
