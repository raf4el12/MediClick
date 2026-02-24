'use client';

import { useEffect, useCallback } from 'react';
import { useAppSelector } from '@/redux-store/hooks';
import { api } from '@/libs/axios';

const VALIDATION_INTERVAL_MS = 5 * 60 * 1000;

export function useSessionValidator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const validateSession = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await api.get('/auth/profile');
    } catch {
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(validateSession, VALIDATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateSession]);
}
