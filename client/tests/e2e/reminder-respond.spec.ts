import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const reminderToken = (action: 'CONFIRM' | 'CANCEL') =>
  `${Buffer.from(JSON.stringify({ appointmentId: 7, action, expiresAt: Date.now() + 3_600_000 })).toString('base64url')}.firma`;

test.describe('respuesta al recordatorio sin sesión', () => {
  test('confirma la asistencia con el token del enlace', async ({ page, api }) => {
    let sentToken: unknown;
    api.on('POST /appointments/actions/respond', ({ body }: ApiRequest) => {
      sentToken = (body as { token: string }).token;
      return { appointmentId: 7, action: 'CONFIRM', status: 'CONFIRMED', message: 'Tu asistencia quedó confirmada.' };
    });
    const token = reminderToken('CONFIRM');

    await page.goto(`/appointment/respond?token=${encodeURIComponent(token)}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Confirmar asistencia a tu cita' })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Sí, confirmar asistencia' }).click();

    await expect(page.getByText('Tu asistencia quedó confirmada.')).toBeVisible();
    expect(sentToken).toBe(token);
  });

  test('un token ilegible muestra el error', async ({ page }) => {
    await page.goto('/appointment/respond?token=basura');

    await expect(page.getByText('El enlace de recordatorio no es válido o ha expirado.')).toBeVisible();
    await expectAccessible(page);
  });
});
