import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

const user = (id: number, name: string, lastName: string, role: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `${name} ${lastName}`,
  email: `${name.toLowerCase()}@test.local`,
  role,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  profile: { id: 200 + id, name, lastName, phone: '+51987654321', typeDocument: 'DNI', numberDocument: `4567890${id}` },
  ...overrides,
});

const page = (rows: unknown[], totalRows = rows.length) => ({ totalRows, totalPages: Math.ceil(totalRows / 8), currentPage: 1, rows });

test.describe('gestión de usuarios', () => {
  test.use({ actor: 'ADMIN' });

  let queries: string[];

  test.beforeEach(({ api }) => {
    queries = [];
    api.on('GET /users', ({ query }: ApiRequest) => {
      queries.push(query.toString());
      return page([user(1, 'Rita', 'Recepción', 'RECEPTIONIST'), user(2, 'Gregorio', 'Médico', 'DOCTOR', { isActive: false })], 20);
    });
  });

  test('lista los usuarios de la página con su paginación de servidor', async ({ page: p }) => {
    await p.goto('/users', { timeout: 30_000 });

    const table = p.getByRole('table', { name: 'Usuarios' });
    await expect(table.getByText('Rita Recepción')).toBeVisible();
    await expect(table.getByText('Recepcionista')).toBeVisible();
    await expect(p.getByText('1–8 de 20')).toBeVisible();
    await expectAccessible(p);

    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect.poll(() => queries.at(-1)).toContain('currentPage=2');
  });

  test('la búsqueda viaja al servidor como searchValue y vuelve a la página 1', async ({ page: p }) => {
    await p.goto('/users', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect.poll(() => queries.at(-1)).toContain('currentPage=2');

    await p.getByLabel('Buscar usuario').fill('rita');

    await expect.poll(() => queries.at(-1)).toContain('searchValue=rita');
    expect(queries.at(-1)).toContain('currentPage=1');
  });

  test('filtrar por rol pide la lista del rol', async ({ page: p }) => {
    await p.goto('/users', { timeout: 30_000 });
    await p.getByRole('combobox', { name: 'Rol' }).click();
    await p.getByRole('option', { name: 'Recepcionista' }).click();

    await expect.poll(() => queries.at(-1)).toContain('role=RECEPTIONIST');
  });

  test('crear un usuario desde el drawer envía el alta interna', async ({ page: p, api }) => {
    let body: unknown;
    api.on('POST /users/internal', ({ body: b }: ApiRequest) => {
      body = b;
      return user(3, 'Alba', 'Torres', 'ADMIN');
    });

    await p.goto('/users', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Nuevo usuario' }).click();
    const drawer = p.getByRole('dialog', { name: 'Nuevo usuario' });
    await expect(drawer).toBeVisible();
    await drawer.getByLabel('Nombre de usuario').fill('Alba Torres');
    await drawer.getByLabel('Email').fill('alba@test.local');
    await drawer.getByLabel('Contraseña').fill('secreta123');
    await drawer.getByRole('combobox', { name: 'Rol' }).click();
    await p.getByRole('option', { name: 'Administrador' }).click();
    await drawer.getByLabel('Nombre', { exact: true }).fill('Alba');
    await drawer.getByLabel('Apellido').fill('Torres');
    await expectAccessible(p);
    await drawer.getByRole('button', { name: 'Crear' }).click();

    await expect(p.getByText('Usuario creado')).toBeVisible();
    expect(body).toEqual({
      name: 'Alba Torres',
      email: 'alba@test.local',
      password: 'secreta123',
      role: 'ADMIN',
      profile: { name: 'Alba', lastName: 'Torres', email: 'alba@test.local' },
    });
  });

  test('eliminar pide confirmación y borra en el servidor', async ({ page: p, api }) => {
    let deleted = '';
    api.on('DELETE /users/:id', ({ path }: ApiRequest) => {
      deleted = path;
      return {};
    });

    await p.goto('/users', { timeout: 30_000 });
    await p.getByRole('button', { name: 'Más acciones para Rita Recepción' }).click();
    await p.getByRole('menuitem', { name: 'Eliminar' }).click();
    await p.getByRole('dialog', { name: '¿Eliminar usuario?' }).getByRole('button', { name: 'Eliminar' }).click();

    await expect.poll(() => deleted).toBe('/users/1');
    await expect(p.getByText('Usuario eliminado')).toBeVisible();
  });
});
