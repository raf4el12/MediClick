import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../domain/enums/user-role.enum.js';
import type { AuthenticatedRequest } from '../domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class TenantGuard implements CanActivate {
  private static readonly CROSS_TENANT_ROLES = new Set<UserRole>([
    UserRole.PATIENT,
  ]);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Pacientes y usuarios básicos son cross-tenant
    if (TenantGuard.CROSS_TENANT_ROLES.has(user.role)) {
      return true;
    }

    // Super-admin (ADMIN sin clínica) tiene acceso global
    if (user.role === UserRole.ADMIN && !user.clinicId) {
      return true;
    }

    // Staff debe tener clínica asignada
    if (!user.clinicId) {
      throw new ForbiddenException(
        'No tienes una clínica asignada. Contacta al administrador.',
      );
    }

    return true;
  }
}
