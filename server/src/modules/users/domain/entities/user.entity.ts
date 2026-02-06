import { UserRole } from '@prisma/client';

export class UserEntity {
  id: number;
  name: string;
  email: string;
  password: string;
  photo: string | null;
  role: UserRole;
  isActive: boolean;
  validateEmail: boolean;
  deleted: boolean;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
