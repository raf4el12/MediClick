import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';
import {
  OnboardDoctorData,
  DoctorWithRelations,
} from '../../domain/interfaces/doctor-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

const doctorInclude = {
  profile: {
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      gender: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  specialties: {
    where: { deleted: false },
    select: {
      specialty: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class PrismaDoctorRepository implements IDoctorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(data: OnboardDoctorData): Promise<DoctorWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: data.user.name,
          email: data.user.email,
          password: data.user.password,
          role: 'DOCTOR',
          isActive: true,
        },
      });

      const profile = await tx.profiles.create({
        data: {
          name: data.profile.name,
          lastName: data.profile.lastName,
          email: data.profile.email,
          phone: data.profile.phone,
          gender: data.profile.gender,
          userId: user.id,
        },
      });

      const doctor = await tx.doctors.create({
        data: {
          profileId: profile.id,
          licenseNumber: data.doctor.licenseNumber,
          resume: data.doctor.resume,
        },
      });

      if (data.specialtyIds.length > 0) {
        await tx.doctorsSpecialties.createMany({
          data: data.specialtyIds.map((specialtyId) => ({
            doctorId: doctor.id,
            specialtyId,
          })),
        });
      }

      return tx.doctors.findUniqueOrThrow({
        where: { id: doctor.id },
        include: doctorInclude,
      });
    });
  }

  async findAllPaginated(
    params: PaginationParams,
    specialtyId?: number,
  ): Promise<PaginatedResult<DoctorWithRelations>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where = {
      deleted: false,
      ...(specialtyId && {
        specialties: {
          some: { specialtyId, deleted: false },
        },
      }),
      ...(searchValue && {
        profile: {
          OR: [
            {
              name: {
                contains: searchValue,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
                contains: searchValue,
                mode: 'insensitive' as const,
              },
            },
            {
              email: {
                contains: searchValue,
                mode: 'insensitive' as const,
              },
            },
          ],
        },
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.doctors.findMany({
        where,
        include: doctorInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.doctors.count({ where }),
    ]);

    return {
      totalRows: count,
      rows,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<DoctorWithRelations | null> {
    return this.prisma.doctors.findFirst({
      where: { id, deleted: false },
      include: doctorInclude,
    });
  }

  async existsByLicenseNumber(licenseNumber: string): Promise<boolean> {
    const count = await this.prisma.doctors.count({
      where: { licenseNumber },
    });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.users.count({
      where: { email },
    });
    return count > 0;
  }
}
