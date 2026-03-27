'use client';

import { useEffect, useCallback } from 'react';
import { useAppSelector } from '@/redux-store/hooks';
import { api } from '@/libs/axios';
import { getDeviceId } from '@/utils/device-id';

// Refresh proactively every 10 min (access token lives 15 min → 5 min buffer)
const VALIDATION_INTERVAL_MS = 10 * 60 * 1000;

export function useSessionValidator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const validateSession = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await api.post('/auth/refresh-token', {
        deviceId: getDeviceId(),
      });
    } catch {
      // The axios interceptor already handles 401 → logout
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(validateSession, VALIDATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateSession]);
}
