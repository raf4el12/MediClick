import { UserRole } from '@prisma/client';
import { UserEntity } from '../entities/user.entity.js';

export interface CreateInternalUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  profile: {
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    typeDocument?: string;
    numberDocument?: string;
  };
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: number): Promise<UserEntity | null>;
  updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
  existsByDni(typeDocument: string, numberDocument: string): Promise<boolean>;
  createInternalUser(data: CreateInternalUserData): Promise<UserEntity>;
}
