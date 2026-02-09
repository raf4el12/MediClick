import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

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
  createdAt: Date;
  updatedAt: Date | null;
}
