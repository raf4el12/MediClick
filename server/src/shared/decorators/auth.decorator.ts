import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '../domain/enums/user-role.enum.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { TenantGuard } from '../guards/tenant.guard.js';
import { Roles } from './roles.decorator.js';

export function Auth(...roles: UserRole[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard),
    ApiBearerAuth(),
  );
}
