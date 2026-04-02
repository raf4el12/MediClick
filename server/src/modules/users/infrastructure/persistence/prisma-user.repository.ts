import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IUserRepository } from '../../domain/repositories/user.repository.js';
import {
  CreateInternalUserData,
  UpdateUserData,
  UserWithProfile,
} from '../../domain/interfaces/user-data.interface.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

const userWithProfileInclude = {
  profiles: {
    where: { deleted: false },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      typeDocument: true,
      numberDocument: true,
      address: true,
      state: true,
      country: true,
    },
    take: 1,
  },
} as const;

function mapToUserEntity(prismaUser: any): UserEntity {
  const entity = new UserEntity();
  Object.assign(entity, {
    ...prismaUser,
    roleId: prismaUser.roleId ?? null,
    roleName: prismaUser.role?.name ?? null,
    clinicName: prismaUser.clinic?.name ?? null,
    clinicTimezone: prismaUser.clinic?.timezone ?? null,
  });
  return entity;
}

function mapToUserWithProfile(raw: any): UserWithProfile {
  const profile = raw.profiles?.[0] ?? null;
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    roleId: raw.roleId ?? null,
    roleName: raw.role?.name ?? null,
    isActive: raw.isActive,
    clinicId: raw.clinicId ?? null,
    deleted: raw.deleted,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    profile,
  };
}

const includeRoleAndClinic = {
  role: { select: { id: true, name: true } },
  clinic: { select: { name: true, timezone: true } },
} as const;

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: includeRoleAndClinic,
    });
    return user ? mapToUserEntity(user) : null;
  }

  async findById(id: number): Promise<UserEntity | null> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: includeRoleAndClinic,
    });
    return user ? mapToUserEntity(user) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.users.count({ where: { email } });
    return count > 0;
  }

  async existsByDni(
    typeDocument: string,
    numberDocument: string,
  ): Promise<boolean> {
    const count = await this.prisma.profiles.count({
      where: { typeDocument, numberDocument },
    });
    return count > 0;
  }

  async createInternalUser(data: CreateInternalUserData): Promise<UserEntity> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          roleId: data.roleId,
          clinicId: data.clinicId,
          isActive: true,
        },
        include: includeRoleAndClinic,
      });

      await tx.profiles.create({
        data: {
          name: data.profile.name,
          lastName: data.profile.lastName,
          email: data.profile.email,
          phone: data.profile.phone,
          typeDocument: data.profile.typeDocument,
          numberDocument: data.profile.numberDocument,
          userId: user.id,
        },
      });

      return mapToUserEntity(user);
    });
  }

  async findAllPaginated(
    params: PaginationParams,
    roleId?: number,
    clinicId?: number | null,
  ): Promise<PaginatedResult<UserWithProfile>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where: any = {
      deleted: false,
      ...(clinicId && { clinicId }),
      ...(roleId && { roleId }),
      ...(searchValue && {
        OR: [
          { name: { contains: searchValue, mode: 'insensitive' as const } },
          { email: { contains: searchValue, mode: 'insensitive' as const } },
          {
            profiles: {
              some: {
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
                ],
              },
            },
          },
        ],
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.users.findMany({
        where,
        include: {
          ...userWithProfileInclude,
          role: { select: { id: true, name: true } },
        },
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.users.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows.map(mapToUserWithProfile),
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findByIdWithProfile(id: number): Promise<UserWithProfile | null> {
    const user = await this.prisma.users.findFirst({
      where: { id, deleted: false },
      include: {
        ...userWithProfileInclude,
        role: { select: { id: true, name: true } },
      },
    });
    return user ? mapToUserWithProfile(user) : null;
  }

  async updateUser(id: number, data: UpdateUserData): Promise<UserWithProfile> {
    return this.prisma.$transaction(async (tx) => {
      const userUpdateData: any = {};
      if (data.roleId !== undefined) userUpdateData.roleId = data.roleId;
      if (data.isActive !== undefined) userUpdateData.isActive = data.isActive;
      if (Object.keys(userUpdateData).length > 0) {
        userUpdateData.updatedAt = new Date();
      }

      await tx.users.update({
        where: { id },
        data: userUpdateData,
      });

      if (data.profile) {
        const profileData: any = {};
        if (data.profile.name !== undefined)
          profileData.name = data.profile.name;
        if (data.profile.lastName !== undefined)
          profileData.lastName = data.profile.lastName;
        if (data.profile.phone !== undefined)
          profileData.phone = data.profile.phone;
        if (data.profile.typeDocument !== undefined)
          profileData.typeDocument = data.profile.typeDocument;
        if (data.profile.numberDocument !== undefined)
          profileData.numberDocument = data.profile.numberDocument;
        if (data.profile.address !== undefined)
          profileData.address = data.profile.address;
        if (data.profile.state !== undefined)
          profileData.state = data.profile.state;
        if (data.profile.country !== undefined)
          profileData.country = data.profile.country;

        if (Object.keys(profileData).length > 0) {
          profileData.updatedAt = new Date();
          const profile = await tx.profiles.findFirst({
            where: { userId: id, deleted: false },
          });
          if (profile) {
            await tx.profiles.update({
              where: { id: profile.id },
              data: profileData,
            });
          } else {
            const user = await tx.users.findUniqueOrThrow({ where: { id } });
            await tx.profiles.create({
              data: {
                name: profileData.name ?? user.name,
                lastName: profileData.lastName ?? '',
                email: user.email,
                userId: id,
                ...profileData,
              },
            });
          }
        }
      }

      const updated = await tx.users.findUniqueOrThrow({
        where: { id },
        include: {
          ...userWithProfileInclude,
          role: { select: { id: true, name: true } },
        },
      });
      return mapToUserWithProfile(updated);
    });
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.prisma.users.update({
      where: { id },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.users.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }
}
