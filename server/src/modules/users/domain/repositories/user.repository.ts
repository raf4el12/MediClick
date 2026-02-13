import { UserEntity } from '../entities/user.entity.js';
import {
  CreateInternalUserData,
  UpdateUserData,
  UserWithProfile,
} from '../interfaces/user-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: number): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByDni(typeDocument: string, numberDocument: string): Promise<boolean>;
  createInternalUser(data: CreateInternalUserData): Promise<UserEntity>;
  findAllPaginated(
    params: PaginationParams,
    role?: UserRole,
  ): Promise<PaginatedResult<UserWithProfile>>;
  findByIdWithProfile(id: number): Promise<UserWithProfile | null>;
  updateUser(id: number, data: UpdateUserData): Promise<UserWithProfile>;
  softDelete(id: number): Promise<void>;
}
