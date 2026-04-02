import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/permissions.constant.js';

export interface RequiredPermission {
  action: string;
  subject: string;
}

/**
 * Decorador para requerir permisos específicos en un endpoint.
 *
 * @example
 * @RequirePermissions('CREATE', 'APPOINTMENTS')
 * @RequirePermissions('MANAGE', 'ALL')
 */
export const RequirePermissions = (action: string, subject: string) =>
  SetMetadata(PERMISSIONS_KEY, { action, subject } as RequiredPermission);
