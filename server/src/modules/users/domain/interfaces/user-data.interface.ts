export interface CreateInternalUserData {
  name: string;
  email: string;
  password: string;
  roleId: number;
  clinicId?: number;
  profile: {
    name: string;
    lastName: string;
    phone?: string;
    typeDocument?: string;
    numberDocument?: string;
  };
}

export interface UpdateUserData {
  roleId?: number;
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
  roleId: number | null;
  roleName: string | null;
  isActive: boolean;
  clinicId: number | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  profile: {
    id: number;
    name: string;
    lastName: string;
    phone: string | null;
    typeDocument: string | null;
    numberDocument: string | null;
    address: string | null;
    state: string | null;
    country: string | null;
  } | null;
}
