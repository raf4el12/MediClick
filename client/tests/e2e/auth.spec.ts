import type { BrowserContext, Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiMock } from '../support/api';
import { doctor } from '../support/defaults/doctor';
import { patient } from '../support/defaults/patient';
import { expect, test } from '../support/fixtures';
import { accessTokenFor, type ActorProfile } from '../support/session';

// El backend real deja la cookie de sesión en la respuesta del login; el mock
// la siembra en ese momento para que el middleware deje pasar al inicio.
function acceptLogin(api: ApiMock, context: BrowserContext, appURL: string, profile: ActorProfile) {
  for (const [key, fixture] of Object.entries(profile.routes)) api.on(key, fixture);
  api.on('POST /auth/login', async () => {
    await context.addCookies([{ name: 'accessToken', value: accessTokenFor(profile), url: appURL }]);
    return { accessToken: 'token-de-prueba', user: profile.user };
  });
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('secreta123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test.describe('inicio de sesión', () => {
  test('el paciente entra a su portal', async ({ page, api, context, baseURL }) => {
    acceptLogin(api, context, baseURL!, patient);

    await signIn(page, patient.user.email);

    await expect(page).toHaveURL(/\/patient$/, { timeout: 15_000 });
  });

  test('el médico entra a su inicio', async ({ page, api, context, baseURL }) => {
    acceptLogin(api, context, baseURL!, doctor);
    api.on('GET /appointments/doctor/today', []);

    await signIn(page, doctor.user.email);

    await expect(page).toHaveURL(/\/doctor$/, { timeout: 15_000 });
  });

  test('las credenciales inválidas muestran el error del backend', async ({ page, api }) => {
    api.on('POST /auth/login', reply(401, { message: 'Credenciales inválidas' }));

    await signIn(page, 'nadie@test.local');

    await expect(page.getByRole('alert').filter({ hasText: 'Credenciales inválidas' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('recuperar contraseña', () => {
  test('pide el código y permite reenviarlo con el teclado', async ({ page, api }) => {
    let sent = 0;
    api.on('POST /auth/forgot-password', () => {
      sent += 1;
      return {};
    });

    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('ana.paciente@test.local');
    await page.getByRole('button', { name: 'Enviar código' }).click();

    await expect(page.getByRole('heading', { name: 'Verificar código' })).toBeVisible();
    const resend = page.getByRole('button', { name: 'Reenviar código' });
    await resend.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => sent).toBe(2);

    await expectAccessible(page);
  });
});

for (const path of ['/login', '/forgot-password', '/reset-password?token=x', '/reset-password']) {
  test(`${path} cumple WCAG 2.1 AA`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expectAccessible(page);
  });
}
