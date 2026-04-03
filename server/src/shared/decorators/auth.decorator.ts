import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
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
    UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard),
    ApiBearerAuth(),
  );
}
