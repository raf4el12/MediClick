import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

/** Respuesta de `GET /auth/me`. */
function me(role: 'PATIENT' | 'DOCTOR') {
  const isPatient = role === 'PATIENT';
  return {
    id: isPatient ? 100 : 200,
    name: isPatient ? 'Ana' : 'Gregorio',
    email: isPatient ? 'ana.paciente@test.local' : 'gregorio.medico@test.local',
    role,
    permissions: [],
    isActive: true,
    deleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    profile: {
      id: 1,
      name: isPatient ? 'Ana' : 'Gregorio',
      lastName: isPatient ? 'Paciente' : 'Médico',
      email: isPatient ? 'ana.paciente@test.local' : 'gregorio.medico@test.local',
      phone: '+51987654321',
      typeDocument: 'DNI',
      numberDocument: '12345678',
      address: 'Av. Larco 1150',
      state: 'Lima',
      country: 'Perú',
    },
  };
}

const main = (page: Page) => page.locator('#main-content');

const notification = (id: number, isRead = false) => ({
  id,
  userId: 100,
  type: 'APPOINTMENT_REMINDER',
  channel: 'IN_APP',
  title: `Recordatorio ${id}`,
  message: 'Tienes una cita mañana a las 10:00',
  isRead,
  metadata: null,
  sentAt: null,
  createdAt: new Date().toISOString(),
});

for (const role of ['PATIENT', 'DOCTOR'] as const) {
  test.describe(`cuenta (${role})`, () => {
    test.use({ actor: role });

    test('abre la cuenta con su propio layout y guardar envía el perfil', async ({ page, api }) => {
      let saved: unknown;
      api.on('GET /auth/me', me(role));
      api.on('PATCH /auth/profile', ({ body }: ApiRequest) => {
        saved = body;
        return { ...me(role), profile: { ...me(role).profile, ...(body as object) } };
      });

      await page.goto('/settings/account', { timeout: 30_000 });

      await expect(main(page).getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeVisible();
      if (role === 'PATIENT') {
        await expect(page.getByRole('link', { name: 'Mis Citas' }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'Jornada' })).toHaveCount(0);
      } else {
        await expect(page.getByRole('link', { name: 'Jornada' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Mis Citas' })).toHaveCount(0);
      }
      await expect(page.getByRole('tab', { name: 'Cuenta' })).toHaveAttribute('aria-selected', 'true');
      await expect(main(page).getByText(role === 'PATIENT' ? 'Paciente' : 'Doctor', { exact: true })).toBeVisible();
      await expectAccessible(page);

      await main(page).getByLabel('Dirección').fill('Av. Arequipa 500');
      await main(page).getByRole('button', { name: 'Guardar cambios' }).click();

      await expect(page.getByText('Perfil actualizado')).toBeVisible();
      expect(saved).toEqual({
        name: me(role).profile.name,
        lastName: me(role).profile.lastName,
        phone: '+51987654321',
        typeDocument: 'DNI',
        numberDocument: '12345678',
        address: 'Av. Arequipa 500',
        state: 'Lima',
        country: 'Perú',
      });
    });

    test('seguridad: una confirmación distinta no envía el cambio y cerrar una sesión manda su dispositivo', async ({ page, api }) => {
      const passwordCalls: unknown[] = [];
      const loggedOut: unknown[] = [];
      let loggedOutAll = false;
      api.on('GET /auth/me', me(role));
      api.on('GET /auth/sessions', [
        { deviceId: 'navegador-actual-01', createdAt: Date.now() - 3_600_000, isCurrent: true },
        { deviceId: 'telefono-de-ana-0001', createdAt: Date.now() - 86_400_000, isCurrent: false },
      ]);
      api.on('PATCH /auth/change-password', ({ body }: ApiRequest) => {
        passwordCalls.push(body);
        return { message: 'ok' };
      });
      api.on('POST /auth/logout', ({ body }: ApiRequest) => {
        loggedOut.push(body);
        return {};
      });
      api.on('POST /auth/logout-all', () => {
        loggedOutAll = true;
        return {};
      });

      await page.goto('/settings/account?tab=seguridad', { timeout: 30_000 });
      await expect(page.getByRole('tab', { name: 'Seguridad' })).toHaveAttribute('aria-selected', 'true');

      await main(page).getByLabel('Contraseña actual', { exact: true }).fill('Actual123');
      await main(page).getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClave1');
      await main(page).getByLabel('Confirmar nueva contraseña', { exact: true }).fill('OtraClave1');
      await main(page).getByRole('button', { name: 'Cambiar contraseña' }).click();
      await expect(main(page).getByText('Las contraseñas no coinciden')).toBeVisible();
      expect(passwordCalls).toEqual([]);

      await expect(main(page).getByText('Este dispositivo')).toBeVisible();
      await expectAccessible(page);
      await main(page).getByRole('button', { name: 'Cerrar la sesión de Dispositivo …ana-0001' }).click();
      await expect.poll(() => loggedOut).toEqual([{ deviceId: 'telefono-de-ana-0001' }]);

      await main(page).getByRole('button', { name: 'Cerrar todas' }).click();
      const confirm = page.getByRole('dialog', { name: 'Cerrar todas las sesiones' });
      await confirm.getByRole('button', { name: 'Cerrar todas' }).click();
      await expect.poll(() => loggedOutAll).toBe(true);
    });

    test('la bandeja marca todas como leídas y el contador de la barra queda en cero', async ({ page, api }) => {
      let unread = 2;
      api.on('GET /notifications/unread-count', () => ({ count: unread }));
      api.on('GET /notifications', ({ query }: ApiRequest) => {
        const rows = [notification(1, unread === 0), notification(2, unread === 0)];
        const filtered = query.get('isRead') === 'false' ? rows.filter((n) => !n.isRead) : rows;
        return { data: filtered, total: filtered.length, page: 1, limit: 10, totalPages: 1 };
      });
      api.on('PATCH /notifications/read-all', () => {
        unread = 0;
        return { markedCount: 2 };
      });

      await page.goto('/notifications', { timeout: 30_000 });

      await expect(main(page).getByRole('heading', { level: 1, name: 'Notificaciones' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeVisible();
      await expect(main(page).getByText('Recordatorio 1')).toBeVisible();
      await expectAccessible(page);

      await main(page).getByRole('button', { name: 'Marcar todas como leídas' }).click();

      await expect(page.getByRole('button', { name: 'Notificaciones', exact: true })).toBeVisible();
      await expect(main(page).getByText('Todas leídas')).toBeVisible();
    });
  });
}

test.describe('rutas anteriores de perfil', () => {
  test.describe('paciente', () => {
    test.use({ actor: 'PATIENT' });

    test('/patient/profile lleva a la cuenta', async ({ page, api }) => {
      api.on('GET /auth/me', me('PATIENT'));
      await page.goto('/patient/profile', { timeout: 30_000 });
      await expect(page).toHaveURL(/\/settings\/account\?tab=cuenta$/);
    });
  });

  test.describe('personal', () => {
    test.use({ actor: 'DOCTOR' });

    test('/profile lleva a la cuenta y una pestaña desconocida abre Cuenta', async ({ page, api }) => {
      api.on('GET /auth/me', me('DOCTOR'));
      await page.goto('/profile', { timeout: 30_000 });
      await expect(page).toHaveURL(/\/settings\/account\?tab=cuenta$/);

      await page.goto('/settings/account?tab=lo-que-sea');
      await expect(page.getByRole('tab', { name: 'Cuenta' })).toHaveAttribute('aria-selected', 'true');
    });
  });
});
