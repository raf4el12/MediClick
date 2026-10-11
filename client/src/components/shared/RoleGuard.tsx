'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { actorFor, homePathFor, type Actor } from '@/configs/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionCheck {
  action: string;
  subject: string;
}

interface RoleGuardProps {
  /** Permisos requeridos: el usuario necesita AL MENOS uno para acceder */
  permissions: PermissionCheck[];
  /**
   * Actores que pueden ver la ruta. Hace falta cuando un permiso lo comparten actores distintos
   * (p. ej. el paciente también tiene `READ:PATIENTS`); el resto vuelve a su inicio.
   */
  actors?: Actor[];
  children: React.ReactNode;
}

/**
 * Guarda de acceso basado en permisos.
 * Sin al menos uno de los permisos requeridos, redirige a `/401`.
 */
export function RoleGuard({ permissions: required, actors, children }: RoleGuardProps) {
  const router = useRouter();
  const { hasAnyPermission, roleName } = usePermissions();

  const hasAccess = hasAnyPermission(required);
  const actor = actorFor(roleName);
  const actorAllowed = !actors || actors.includes(actor);

  useEffect(() => {
    if (!roleName) return;
    if (!actorAllowed) router.replace(homePathFor(actor));
    else if (!hasAccess) router.replace('/401');
  }, [roleName, hasAccess, actorAllowed, actor, router]);

  if (!roleName || !hasAccess || !actorAllowed) return null;

  return <>{children}</>;
}
