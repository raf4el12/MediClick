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
