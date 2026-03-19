import { UserRole } from '../enums/user-role.enum.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  clinicId: number | null;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}
