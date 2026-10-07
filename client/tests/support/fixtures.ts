import { test as base, expect } from '@playwright/test';
import { ApiMock } from './api';
import { seedSession, type Actor, type ActorProfile } from './session';
import { admin } from './defaults/admin';
import { doctor } from './defaults/doctor';
import { patient } from './defaults/patient';
import { receptionist } from './defaults/receptionist';

const PROFILES: Record<Actor, ActorProfile> = {
  PATIENT: patient,
  DOCTOR: doctor,
  RECEPTIONIST: receptionist,
  ADMIN: admin,
};

type HarnessFixtures = {
  /** Actor con sesión sembrada; `null` navega sin sesión. */
  actor: Actor | null;
  api: ApiMock;
};

export const test = base.extend<HarnessFixtures>({
  actor: [null, { option: true }],
  api: [
    async ({ page, context, actor, baseURL }, use) => {
      const appURL = baseURL ?? 'http://localhost:3100';
      const profile = actor ? PROFILES[actor] : null;
      if (profile) await seedSession(context, profile, appURL);

      const api = new ApiMock(profile?.routes ?? {}, new URL(appURL).origin);
      await api.install(page);
      await use(api);

      expect(api.unmatched, `Llamadas sin fixture:\n${api.unmatched.join('\n')}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
