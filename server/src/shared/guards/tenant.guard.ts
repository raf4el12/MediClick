import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SystemRole } from '../domain/enums/permission.enum.js';
import { getRequestFromContext } from '../utils/get-request-from-context.js';

@Injectable()
export class TenantGuard implements CanActivate {
  private static readonly CROSS_TENANT_ROLES = new Set<string>([
    SystemRole.PATIENT,
  ]);

  canActivate(context: ExecutionContext): boolean {
    const request = getRequestFromContext(context);
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Pacientes son cross-tenant
    if (TenantGuard.CROSS_TENANT_ROLES.has(user.roleName)) {
      return true;
    }

    // Super-admin (SUPER_ADMIN o ADMIN sin clínica) tiene acceso global
    if (
      user.roleName === SystemRole.SUPER_ADMIN ||
      (user.roleName === SystemRole.ADMIN && !user.clinicId)
    ) {
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
