import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/roles.constant.js';
import { UserRole } from '@prisma/client';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
