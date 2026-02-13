import { Injectable, Inject } from '@nestjs/common';
import {
  UserDetailResponseDto,
  PaginatedUserResponseDto,
} from '../dto/user-detail-response.dto.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    role?: UserRole,
  ): Promise<PaginatedUserResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.userRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      role,
    );

    const rows: UserDetailResponseDto[] = result.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
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
