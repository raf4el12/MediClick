'use client';

import { useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { actorFor, navigationFor } from '@configs/navigation';

/** Navegación del usuario autenticado según su rol y sus permisos. */
export function useActorNavigation() {
  const { hasPermission, roleName } = usePermissions();
  const actor = actorFor(roleName);

  return useMemo(() => ({ actor, ...navigationFor(actor, hasPermission) }), [actor, hasPermission]);
}
