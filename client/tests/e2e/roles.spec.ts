import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const perm = (id: number, action: string, subject: string) => ({ id, action, subject, description: null });

const permissions = [
  perm(1, 'READ', 'PATIENTS'),
  perm(2, 'CREATE', 'PATIENTS'),
  perm(3, 'UPDATE', 'PATIENTS'),
  perm(4, 'READ', 'APPOINTMENTS'),
  perm(5, 'UPDATE', 'APPOINTMENTS'),
  perm(6, 'MANAGE', 'ALL'),
];

const role = (overrides: Record<string, unknown>) => ({
  id: 1,
  name: 'ADMIN',
  description: 'Administración de la sede',
  isSystem: true,
  clinicId: null,
  permissions: [permissions[5]],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const admin = role({});
const nursing = role({ id: 5, name: 'Enfermería', description: 'Apoyo en triaje', isSystem: false, clinicId: 1, permissions: [permissions[0]] });

const main = (page: Page) => page.locator('#main-content');

test.describe('roles y permisos', () => {
  test.use({ actor: 'ADMIN' });

  test.beforeEach(({ api }) => {
    api.on('GET /roles', [admin, nursing]);
    api.on('GET /permissions', permissions);
  });

  test('editar un rol envía los permisos marcados en la matriz', async ({ page, api }) => {
    let patched: { name: string; description?: string; permissionIds: number[] } | undefined;
    api.on('PATCH /roles/:id', ({ body }: ApiRequest) => {
      patched = body as typeof patched;
      return { ...nursing, ...(body as object) };
    });

    await page.goto('/roles', { timeout: 30_000 });
    await expect(main(page).getByRole('heading', { level: 1, name: 'Roles y permisos' })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Editar el rol Enfermería' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar rol' });
    await expect(dialog.getByLabel('Nombre del rol')).toHaveValue('Enfermería');
    await expect(dialog.getByRole('checkbox', { name: 'Pacientes: Leer' })).toBeChecked();
    await expectAccessible(page);

    await dialog.getByRole('checkbox', { name: 'Pacientes: todas las acciones' }).check();
    await dialog.getByRole('checkbox', { name: 'Citas: Leer' }).check();
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Rol actualizado')).toBeVisible();
    expect(patched?.name).toBe('Enfermería');
    expect(patched?.description).toBe('Apoyo en triaje');
    expect([...(patched?.permissionIds ?? [])].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  test('un rol de sistema se ve en solo lectura y no se puede borrar', async ({ page }) => {
    await page.goto('/roles', { timeout: 30_000 });

    await expect(page.getByRole('button', { name: 'Editar el rol ADMIN' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar el rol ADMIN' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar el rol Enfermería' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver los permisos del rol ADMIN' }).click();
    const dialog = page.getByRole('dialog', { name: 'Permisos de ADMIN' });
    await expect(dialog.getByRole('checkbox', { name: 'Todos: Gestionar' })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Todos: Gestionar' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Guardar' })).toHaveCount(0);
  });

  test('crear un rol envía su nombre y sus permisos', async ({ page, api }) => {
    let created: unknown;
    api.on('POST /roles', ({ body }: ApiRequest) => {
      created = body;
      return role({ id: 9, isSystem: false, ...(body as object), permissions: [] });
    });

    await page.goto('/roles', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Agregar rol' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo rol' });
    await dialog.getByLabel('Nombre del rol').fill('Caja');
    await dialog.getByRole('checkbox', { name: 'Citas: Leer' }).check();
    await dialog.getByRole('button', { name: 'Crear rol' }).click();

    await expect(page.getByText('Rol creado')).toBeVisible();
    expect(created).toEqual({ name: 'Caja', permissionIds: [4] });
  });

  test('eliminar un rol personalizado pide confirmación', async ({ page, api }) => {
    let deleted = false;
    api.on('DELETE /roles/:id', () => {
      deleted = true;
      return {};
    });

    await page.goto('/roles', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Eliminar el rol Enfermería' }).click();
    await page.getByRole('dialog', { name: 'Eliminar el rol' }).getByRole('button', { name: 'Eliminar' }).click();

    await expect.poll(() => deleted).toBe(true);
  });
});
