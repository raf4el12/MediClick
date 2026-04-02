import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  PERMISSIONS_KEY,
  ROLE_PERMISSIONS_CACHE_PREFIX,
  ROLE_PERMISSIONS_CACHE_TTL,
} from '../constants/permissions.constant.js';
import type { RequiredPermission } from '../decorators/require-permissions.decorator.js';
import type { AuthenticatedRequest } from '../domain/interfaces/authenticated-user.interface.js';

interface CachedPermission {
  action: string;
  subject: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay @RequirePermissions en este endpoint, permitir
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.roleId) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    const permissions = await this.getPermissions(user.roleId);
    const hasPermission = this.matchPermission(permissions, required);

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    return true;
  }

  private async getPermissions(roleId: number): Promise<CachedPermission[]> {
    const cacheKey = `${ROLE_PERMISSIONS_CACHE_PREFIX}:${roleId}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as CachedPermission[];
      }
    } catch {
      this.logger.warn(`Error leyendo caché de permisos para rol ${roleId}`);
    }

    // Cache miss — consultar BD
    const rolePermissions = await this.prisma.rolePermissions.findMany({
      where: { roleId },
      include: { permission: { select: { action: true, subject: true } } },
    });

    const permissions: CachedPermission[] = rolePermissions.map((rp) => ({
      action: rp.permission.action,
      subject: rp.permission.subject,
    }));

    // Guardar en caché
    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(permissions),
        ROLE_PERMISSIONS_CACHE_TTL,
      );
    } catch {
      this.logger.warn(`Error escribiendo caché de permisos para rol ${roleId}`);
    }

    return permissions;
  }

  /**
   * Verifica si el array de permisos del usuario hace match con el permiso requerido.
   * Soporta wildcard: MANAGE:ALL permite todo, MANAGE:{subject} permite todas las acciones
   * sobre ese subject, {action}:ALL permite esa acción sobre todos los subjects.
   */
  private matchPermission(
    permissions: CachedPermission[],
    required: RequiredPermission,
  ): boolean {
    return permissions.some((p) => {
      const actionMatch =
        p.action === required.action || p.action === 'MANAGE';
      const subjectMatch =
        p.subject === required.subject || p.subject === 'ALL';
      return actionMatch && subjectMatch;
    });
  }
}
