'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import DashboardView from '@/views/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (user?.role === 'PATIENT') {
      router.replace('/patient');
    }
  }, [user?.role, router]);

  if (user?.role === 'PATIENT') return null;

  return <DashboardView />;
}
