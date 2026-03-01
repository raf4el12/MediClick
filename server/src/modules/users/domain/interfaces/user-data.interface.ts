import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

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

export interface UpdateUserData {
  role?: UserRole;
  isActive?: boolean;
  profile?: {
    name?: string;
    lastName?: string;
    phone?: string;
    typeDocument?: string;
    numberDocument?: string;
    address?: string;
    state?: string;
    country?: string;
  };
}

export interface UserWithProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  profile: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    phone: string | null;
    typeDocument: string | null;
    numberDocument: string | null;
    address: string | null;
    state: string | null;
    country: string | null;
  } | null;
}
