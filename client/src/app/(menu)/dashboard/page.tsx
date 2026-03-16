'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { UserRole } from '@/types/auth.types';
import DashboardView from '@/views/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (user?.role === UserRole.PATIENT) {
      router.replace('/patient');
    }
  }, [user?.role, router]);

  if (user?.role === UserRole.PATIENT) return null;

  return <DashboardView />;
}
