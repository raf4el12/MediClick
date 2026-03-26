'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { UserRole } from '@/types/auth.types';

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const router = useRouter();
  const user = useAppSelector(selectUser);

  const hasAccess = user?.role ? roles.includes(user.role as UserRole) : false;

  useEffect(() => {
    if (user && !hasAccess) {
      const target = user.role === UserRole.PATIENT ? '/patient' : '/dashboard';
      router.replace(target);
    }
  }, [user, hasAccess, router]);

  if (!user || !hasAccess) return null;

  return <>{children}</>;
}
