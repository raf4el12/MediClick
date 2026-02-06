import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  IUserRepository,
  CreateInternalUserData,
} from '../../domain/repositories/user.repository.js';
import { UserEntity } from '../../domain/entities/user.entity.js';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.prisma.users.findUnique({
      where: { id },
    });
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.users.count({
      where: { email },
    });
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
          role: data.role,
          isActive: true,
        },
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

      return user;
    });
  }
}
