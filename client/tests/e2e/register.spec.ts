import type { BrowserContext, Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiMock, type ApiRequest } from '../support/api';
import { patient } from '../support/defaults/patient';
import { expect, test } from '../support/fixtures';
import { accessTokenFor } from '../support/session';

/** El backend deja la cookie de sesión al registrar; el mock la siembra en ese momento. */
function acceptRegister(api: ApiMock, context: BrowserContext, appURL: string, onBody: (body: unknown) => void) {
  for (const [key, fixture] of Object.entries(patient.routes)) api.on(key, fixture);
  api.on('POST /auth/register', async ({ body }: ApiRequest) => {
    onBody(body);
    await context.addCookies([{ name: 'accessToken', value: accessTokenFor(patient), url: appURL }]);
    return { accessToken: 'token-de-prueba', user: patient.user };
  });
}

const step = (page: Page, title: string) => page.getByRole('heading', { level: 2, name: new RegExp(title) });

/**
 * Primer campo tras cargar la página: si se escribe antes de que React hidrate, el valor se pierde
 * al hidratar. Se reintenta hasta que el valor queda.
 */
async function fillDocument(page: Page, value: string) {
  const input = page.getByLabel('Número de documento');
  await expect(async () => {
    await input.fill(value);
    await expect(input).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

async function fillPhone(page: Page, label: string, digits: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.click();
  await input.press('End');
  await input.pressSequentially(digits);
}

test.describe('registro del paciente', () => {
  test.beforeEach(({ api }) => {
    api.on('POST /auth/check-document', { available: true });
    api.on('POST /auth/lookup-document', { found: true, name: 'Ana', lastName: 'Torres', birthday: '1990-05-12', gender: 'F' });
    api.on('POST /auth/check-email', { available: true });
  });

  test('recorre los cuatro pasos, autocompleta con el documento y entra al portal', async ({ page, api, context, baseURL }) => {
    let registered: unknown;
    acceptRegister(api, context, baseURL!, (body) => (registered = body));

    await page.goto('/register', { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta de paciente' })).toBeVisible();
    await expect(step(page, 'Identificación')).toBeVisible();
    await expectAccessible(page);

    await fillDocument(page, '45678912');
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(step(page, 'Datos personales')).toBeVisible();
    await expect(page.getByLabel('Nombres')).toHaveValue('Ana');
    await expect(page.getByLabel('Apellidos')).toHaveValue('Torres');
    await expect(page.getByLabel('Fecha de nacimiento')).toHaveValue('1990-05-12');
    await page.getByLabel('Correo electrónico').fill('ana.torres@test.local');
    await fillPhone(page, 'Celular', '987654321');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(step(page, 'Información médica')).toBeVisible();
    await fillPhone(page, 'Contacto de emergencia', '912345678');
    await page.getByRole('combobox', { name: 'Tipo de sangre' }).click();
    await page.getByRole('option', { name: 'O+' }).click();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(step(page, 'Credenciales')).toBeVisible();
    await page.getByLabel('Contraseña', { exact: true }).fill('Secreta123');
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Secreta123');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/patient$/, { timeout: 15_000 });
    expect(registered).toEqual({
      typeDocument: 'DNI',
      numberDocument: '45678912',
      name: 'Ana',
      lastName: 'Torres',
      email: 'ana.torres@test.local',
      phone: '+51987654321',
      birthday: '1990-05-12',
      gender: 'F',
      emergencyContact: '+51912345678',
      bloodType: 'O+',
      allergies: '',
      chronicConditions: '',
      password: 'Secreta123',
    });
  });

  test('un documento ya registrado no deja pasar del primer paso', async ({ page, api }) => {
    api.on('POST /auth/check-document', { available: false });

    await page.goto('/register', { timeout: 30_000 });
    await fillDocument(page, '45678912');
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.getByText('Este documento ya está registrado')).toBeVisible();
    await expect(step(page, 'Identificación')).toBeVisible();
  });

  test('si el servidor limita el registro, se ve su mensaje y no navega', async ({ page, api }) => {
    api.on('POST /auth/register', reply(429, { message: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.' }));

    await page.goto('/register', { timeout: 30_000 });
    await fillDocument(page, '45678912');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Correo electrónico').fill('ana.torres@test.local');
    await fillPhone(page, 'Celular', '987654321');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await fillPhone(page, 'Contacto de emergencia', '912345678');
    await page.getByRole('combobox', { name: 'Tipo de sangre' }).click();
    await page.getByRole('option', { name: 'O+' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Contraseña', { exact: true }).fill('Secreta123');
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Secreta123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Demasiados intentos' })).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });
});
