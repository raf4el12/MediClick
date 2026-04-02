'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionCheck {
  action: string;
  subject: string;
}

interface RoleGuardProps {
  /** Permisos requeridos: el usuario necesita AL MENOS uno para acceder */
  permissions: PermissionCheck[];
  children: React.ReactNode;
}

/**
 * Guarda de acceso basado en permisos.
 * Redirige al usuario si no tiene al menos uno de los permisos requeridos.
 */
export function RoleGuard({ permissions: required, children }: RoleGuardProps) {
  const router = useRouter();
  const { hasAnyPermission, roleName } = usePermissions();

  const hasAccess = hasAnyPermission(required);

  useEffect(() => {
    if (roleName && !hasAccess) {
      const target = roleName === 'PATIENT' ? '/patient' : '/dashboard';
      router.replace(target);
    }
  }, [roleName, hasAccess, router]);

  if (!roleName || !hasAccess) return null;

  return <>{children}</>;
}
