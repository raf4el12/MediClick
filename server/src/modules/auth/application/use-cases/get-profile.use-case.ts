import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { UserWithProfile } from '../../../users/domain/interfaces/user-data.interface.js';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    userId: number,
  ): Promise<UserWithProfile & { role: string | null; permissions: string[] }> {
    const user = await this.userRepository.findByIdWithProfile(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rolePermissions = user.roleId
      ? await this.prisma.rolePermissions.findMany({
          where: { roleId: user.roleId },
          include: { permission: { select: { action: true, subject: true } } },
        })
      : [];
    const permissions = rolePermissions.map(
      (rp) => `${rp.permission.action}:${rp.permission.subject}`,
    );

    return {
      ...user,
      role: user.roleName,
      permissions,
    };
  }
}
