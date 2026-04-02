'use client';

import { useCallback } from 'react';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';

/**
 * Hook para verificar permisos del usuario autenticado.
 * Los permisos vienen como strings "ACTION:SUBJECT" (ej: "READ:APPOINTMENTS").
 * Soporta wildcard: MANAGE:ALL permite todo.
 */
export function usePermissions() {
  const user = useAppSelector(selectUser);
  const permissions = user?.permissions ?? [];
  const roleName = user?.role ?? null;

  const hasPermission = useCallback(
    (action: string, subject: string): boolean => {
      return permissions.some((p) => {
        const [pAction, pSubject] = p.split(':');
        const actionMatch = pAction === action || pAction === 'MANAGE';
        const subjectMatch = pSubject === subject || pSubject === 'ALL';
        return actionMatch && subjectMatch;
      });
    },
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (checks: Array<{ action: string; subject: string }>): boolean => {
      return checks.some((c) => hasPermission(c.action, c.subject));
    },
    [hasPermission],
  );

  return { hasPermission, hasAnyPermission, permissions, roleName };
}
