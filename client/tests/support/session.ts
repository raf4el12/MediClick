import type { BrowserContext } from '@playwright/test';
import type { ApiRoutes } from './api';

export type Actor = 'PATIENT' | 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN';

export type ActorProfile = {
  user: {
    id: number;
    name: string;
    email: string;
    role: Actor;
    permissions: string[];
    clinicName?: string | null;
    clinicTimezone?: string | null;
  };
  clinicId: number | null;
  routes: ApiRoutes;
};

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * Siembra la sesión como la deja el login real: la cookie `accessToken` que
 * decodifica `middleware.ts` (sin verificar firma) y el estado `auth` que
 * `redux-persist` guarda en `localStorage`, de donde salen los permisos.
 */
export async function seedSession(
  context: BrowserContext,
  profile: ActorProfile,
  appURL: string,
): Promise<void> {
  const token = [
    base64url({ alg: 'none', typ: 'JWT' }),
    base64url({
      sub: profile.user.id,
      roleName: profile.user.role,
      clinicId: profile.clinicId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    'x',
  ].join('.');
  await context.addCookies([{ name: 'accessToken', value: token, url: appURL }]);

  const persisted = JSON.stringify({
    user: JSON.stringify(profile.user),
    isAuthenticated: 'true',
    _persist: JSON.stringify({ version: 1, rehydrated: true }),
  });
  await context.addInitScript((value) => {
    window.localStorage.setItem('persist:auth', value);
  }, persisted);
}
