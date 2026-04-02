'use client';

import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface CanProps {
  action: string;
  subject: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente de renderizado condicional basado en permisos.
 * Muestra `children` solo si el usuario tiene el permiso especificado.
 */
export function Can({ action, subject, children, fallback = null }: CanProps) {
  const { hasPermission } = usePermissions();

  return hasPermission(action, subject) ? <>{children}</> : <>{fallback}</>;
}
