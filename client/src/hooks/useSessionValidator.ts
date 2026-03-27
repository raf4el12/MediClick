'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppSelector } from '@/redux-store/hooks';
import { api } from '@/libs/axios';
import { getDeviceId } from '@/utils/device-id';

// Refresh proactively every 10 min (access token lives 15 min → 5 min buffer)
const VALIDATION_INTERVAL_MS = 10 * 60 * 1000;
// Show warning 2 min before token expiry (at 13 min mark)
const WARNING_THRESHOLD_MS = 13 * 60 * 1000;
// Check for warning every 30 seconds
const WARNING_CHECK_INTERVAL_MS = 30 * 1000;

export function useSessionValidator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [showWarning, setShowWarning] = useState(false);
  const lastRefreshRef = useRef<number>(Date.now());

  const validateSession = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await api.post('/auth/refresh-token', {
        deviceId: getDeviceId(),
      });
      lastRefreshRef.current = Date.now();
      setShowWarning(false);
    } catch {
      // The axios interceptor already handles 401 → logout
    }
  }, [isAuthenticated]);

  const extendSession = useCallback(async () => {
    setShowWarning(false);
    await validateSession();
  }, [validateSession]);

  // Proactive refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    lastRefreshRef.current = Date.now();
    const interval = setInterval(validateSession, VALIDATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateSession]);

  // Warning check interval
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastRefreshRef.current;
      if (elapsed >= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
      }
    }, WARNING_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return { showWarning, extendSession };
}
