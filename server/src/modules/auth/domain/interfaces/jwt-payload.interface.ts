import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}
