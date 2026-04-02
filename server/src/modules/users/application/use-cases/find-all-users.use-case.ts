import { Injectable, Inject } from '@nestjs/common';
import {
  UserDetailResponseDto,
  PaginatedUserResponseDto,
} from '../dto/user-detail-response.dto.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pagination: PaginationImproved,
    role?: UserRole,
    clinicId?: number | null,
  ): Promise<PaginatedUserResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    let roleId: number | undefined;
    if (role) {
      const roleRecord = await this.prisma.roles.findFirst({
        where: { name: role, isSystem: true },
      });
      roleId = roleRecord?.id;
    }

    const result = await this.userRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      roleId,
      clinicId,
    );

    const rows: UserDetailResponseDto[] = result.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.roleName as UserRole,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      profile: u.profile,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
