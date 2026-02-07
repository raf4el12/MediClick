import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/roles.constant.js';
import { UserRole } from '../domain/enums/user-role.enum.js';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
