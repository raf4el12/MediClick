import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import {
  CreatePatientData,
  UpdatePatientData,
  PatientWithRelations,
  PatientWithHistory,
} from '../../domain/interfaces/patient-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

const patientInclude = {
  profile: {
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      birthday: true,
      gender: true,
      typeDocument: true,
      numberDocument: true,
      userId: true,
    },
  },
} as const;

@Injectable()
export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePatientData): Promise<PatientWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: data.user.name,
          email: data.user.email,
          password: data.user.password,
          role: UserRole.PATIENT as any,
        },
      });

      const profile = await tx.profiles.create({
        data: {
          name: data.profile.name,
          lastName: data.profile.lastName,
          email: data.profile.email,
          phone: data.profile.phone,
          birthday: data.profile.birthday,
          gender: data.profile.gender,
          typeDocument: data.profile.typeDocument,
          numberDocument: data.profile.numberDocument,
          userId: user.id,
        },
      });

      const patient = await tx.patients.create({
        data: {
          profileId: profile.id,
          emergencyContact: data.patient.emergencyContact,
          bloodType: data.patient.bloodType,
          allergies: data.patient.allergies,
          chronic_conditions: data.patient.chronicConditions,
        },
        include: patientInclude,
      });

      return this.mapToRelations(patient);
    });
  }

  async findAllPaginated(
    params: PaginationParams & { isActive?: boolean },
  ): Promise<
    PaginatedResult<PatientWithRelations> & {
      activeCount: number;
      inactiveCount: number;
    }
  > {
    const { limit, offset, searchValue, orderBy, orderByMode, isActive } =
      params;

    const baseWhere = {
      deleted: false,
      ...(isActive !== undefined && { isActive }),
      ...(searchValue && {
        OR: [
          {
            profile: {
              name: { contains: searchValue, mode: 'insensitive' as const },
            },
          },
          {
            profile: {
              lastName: { contains: searchValue, mode: 'insensitive' as const },
            },
          },
          {
            profile: {
              email: { contains: searchValue, mode: 'insensitive' as const },
            },
          },
          {
            profile: {
              numberDocument: {
                contains: searchValue,
                mode: 'insensitive' as const,
              },
            },
          },
        ],
      }),
    };

    const searchWhere = {
      deleted: false,
      ...(searchValue && {
        OR: [
          {
            profile: {
              name: { contains: searchValue, mode: 'insensitive' as const },
            },
          },
          {
            profile: {
              lastName: { contains: searchValue, mode: 'insensitive' as const },
            },
          },
          {
            profile: {
              email: { contains: searchValue, mode: 'insensitive' as const },
            },
          },
          {
            profile: {
              numberDocument: {
                contains: searchValue,
                mode: 'insensitive' as const,
              },
            },
          },
        ],
      }),
    };

    const [rows, count, activeCount, inactiveCount] = await Promise.all([
      this.prisma.patients.findMany({
        where: baseWhere,
        include: patientInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.patients.count({ where: baseWhere }),
      this.prisma.patients.count({
        where: { ...searchWhere, isActive: true } as Prisma.PatientsWhereInput,
      }),
      this.prisma.patients.count({
        where: { ...searchWhere, isActive: false } as Prisma.PatientsWhereInput,
      }),
    ]);

    return {
      totalRows: count,
      rows: rows.map((r) => this.mapToRelations(r)),
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
      activeCount,
      inactiveCount,
    };
  }

  async findById(id: number): Promise<PatientWithRelations | null> {
    const result = await this.prisma.patients.findFirst({
      where: { id, deleted: false },
      include: patientInclude,
    });
    return result ? this.mapToRelations(result) : null;
  }

  async findByIdWithHistory(id: number): Promise<PatientWithHistory | null> {
    const result = await this.prisma.patients.findFirst({
      where: { id, deleted: false },
      include: {
        ...patientInclude,
        appointments: {
          where: { deleted: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
            schedule: {
              select: {
                scheduleDate: true,
                timeFrom: true,
                timeTo: true,
                doctor: {
                  select: {
                    id: true,
                    profile: { select: { name: true, lastName: true } },
                  },
                },
                specialty: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!result) return null;

    const base = this.mapToRelations(result);
    return {
      ...base,
      appointments: (result as any).appointments,
    };
  }

  async update(
    id: number,
    data: UpdatePatientData,
  ): Promise<PatientWithRelations> {
    const patient = await this.prisma.patients.findUniqueOrThrow({
      where: { id },
      select: { profileId: true },
    });

    if (data.profile) {
      await this.prisma.profiles.update({
        where: { id: patient.profileId },
        data: { ...data.profile, updatedAt: new Date() },
      });
    }

    const updated = await this.prisma.patients.update({
      where: { id },
      data: {
        ...(data.patient?.emergencyContact && {
          emergencyContact: data.patient.emergencyContact,
        }),
        ...(data.patient?.bloodType && { bloodType: data.patient.bloodType }),
        ...(data.patient?.allergies !== undefined && {
          allergies: data.patient.allergies,
        }),
        ...(data.patient?.chronicConditions !== undefined && {
          chronic_conditions: data.patient.chronicConditions,
        }),
        updatedAt: new Date(),
      },
      include: patientInclude,
    });

    return this.mapToRelations(updated);
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.patients.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.profiles.count({
      where: { email, deleted: false },
    });
    return count > 0;
  }

  async existsByDni(
    typeDocument: string,
    numberDocument: string,
  ): Promise<boolean> {
    const count = await this.prisma.profiles.count({
      where: { typeDocument, numberDocument, deleted: false },
    });
    return count > 0;
  }

  private mapToRelations(raw: any): PatientWithRelations {
    return {
      id: raw.id,
      profileId: raw.profileId,
      emergencyContact: raw.emergencyContact,
      bloodType: raw.bloodType,
      allergies: raw.allergies,
      chronicConditions: raw.chronic_conditions,
      isActive: raw.isActive,
      deleted: raw.deleted,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      profile: raw.profile,
    };
  }
}
