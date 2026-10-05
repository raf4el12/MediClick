import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { TenantGuard } from '../guards/tenant.guard.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';

/** Marca la ruta como autenticada; el throttler la usa para elegir el tracker. */
export const REQUIRES_AUTH_KEY = 'requiresAuth';

/**
 * Decorador combinado de autenticación.
 * Aplica: JWT → TenantGuard → PermissionsGuard
 *
 * Para proteger por permisos, combinar con @RequirePermissions('ACTION', 'SUBJECT').
 * Si no se usa @RequirePermissions, solo autentica y verifica tenant.
 */
export function Auth() {
  return applyDecorators(
    SetMetadata(REQUIRES_AUTH_KEY, true),
    UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard),
    ApiBearerAuth(),
  );
}
