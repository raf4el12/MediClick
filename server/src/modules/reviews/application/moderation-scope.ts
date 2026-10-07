import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/domain/interfaces/authenticated-user.interface.js';

/**
 * Sede dentro de la que el actor puede moderar reseñas: la suya, o `null`
 * (todas) para SUPER_ADMIN y ADMIN sin sede. Un actor sin sede que no es
 * global no modera nada.
 */
export function moderationScope(
  actor: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>,
): number | null {
  if (actor.roleName === 'SUPER_ADMIN') return null;
  if (actor.clinicId !== null) return actor.clinicId;
  if (actor.roleName === 'ADMIN') return null;
  throw new ForbiddenException('No tienes acceso a la moderación de reseñas');
}
