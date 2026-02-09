'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/redux-store/hooks';
import { clearAuth } from '@/redux-store/slices/auth';
import { api } from '@/libs/axios';

const VALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useSessionValidator() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const validateSession = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await api.get('/auth/profile');
    } catch {
      dispatch(clearAuth());
      router.push('/login');
    }
  }, [isAuthenticated, dispatch, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(validateSession, VALIDATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateSession]);
}
