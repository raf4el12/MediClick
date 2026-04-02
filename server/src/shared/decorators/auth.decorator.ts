import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TenantGuard } from '../guards/tenant.guard.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';

/**
 * Decorador combinado de autenticación.
 * Aplica: JWT → TenantGuard → PermissionsGuard
 *
 * Para proteger por permisos, combinar con @RequirePermissions('ACTION', 'SUBJECT').
 * Si no se usa @RequirePermissions, solo autentica y verifica tenant.
 */
export function Auth() {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), TenantGuard, PermissionsGuard),
    ApiBearerAuth(),
  );
}
