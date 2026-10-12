import { expectAccessible } from '../support/accessible';
import { expect, test } from '../support/fixtures';

// Las páginas públicas se renderizan en el servidor y leen el directorio del stub
// (`tests/support/stub-api-server.mjs`), no del arnés del navegador.

test.describe('páginas públicas sin sesión', () => {
  test('la landing presenta la reserva en línea, los médicos destacados y reseñas sin datos del paciente', async ({ page }) => {
    const response = await page.goto('/', { timeout: 30_000 });
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1, name: /Reserva tu cita médica/ })).toBeVisible();
    const featured = page.getByRole('region', { name: 'Médicos destacados' });
    await expect(featured.getByRole('link', { name: /Lucía Paredes/ })).toHaveAttribute('href', '/medicos/1');
    await expect(featured.getByText('4.5 de 5 (2 reseñas)')).toBeVisible();
    await expect(featured.getByText('Sin reseñas')).toBeVisible();
    const reviews = page.getByRole('region', { name: 'Lo que dicen los pacientes' });
    await expect(reviews.getByText('Muy clara al explicar el tratamiento.')).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login');
    await expectAccessible(page);
  });

  test('el directorio filtra por especialidad y sede con la URL', async ({ page }) => {
    await page.goto('/medicos', { timeout: 30_000 });

    await expect(page.getByRole('heading', { level: 1, name: 'Médicos' })).toBeVisible();
    const list = page.getByRole('list', { name: 'Médicos' });
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Especialidad' }).click();
    await page.getByRole('option', { name: 'Dermatología' }).click();
    await expect(page).toHaveURL(/\/medicos\?specialtyId=3$/);
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list.getByRole('link', { name: /Camila Rojas/ })).toBeVisible();

    await page.goto('/medicos?clinicId=2', { timeout: 30_000 });
    await expect(page.getByRole('list', { name: 'Médicos' }).getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText('Mario Vega')).toBeVisible();
  });

  test('el perfil muestra solo datos profesionales y reseñas, y reservar pasa por el inicio de sesión', async ({ page }) => {
    const response = await page.goto('/medicos/1', { timeout: 30_000 });
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Lucía Paredes/);
    await expect(page.getByRole('heading', { level: 1, name: 'Lucía Paredes' })).toBeVisible();
    await expect(page.getByText('CMP-45678')).toBeVisible();
    await expect(page.getByText('Av. Larco 1150, Miraflores')).toBeVisible();
    await expect(page.getByText('4.5 de 5 (2 reseñas)').first()).toBeVisible();
    await expect(page.getByText('Puntual y amable.')).toBeVisible();
    const html = await page.content();
    for (const key of ['"email"', '"phone"', '"patient"', '"patientId"', '"numberDocument"']) expect(html).not.toContain(key);
    await expectAccessible(page);

    await page.getByRole('link', { name: 'Reservar con este médico' }).click();
    await expect(page).toHaveURL(/\/login\?from=%2Fpatient%2Fbook%3FdoctorId%3D1$/, { timeout: 15_000 });
  });

  test('un médico inexistente muestra la página 404', async ({ page }) => {
    const response = await page.goto('/medicos/999', { timeout: 30_000 });

    expect(response?.status()).toBe(404);
    await expect(page.getByText('Página no encontrada')).toBeVisible();
  });

  test('en modo oscuro la landing y el perfil siguen siendo accesibles', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: /Reserva tu cita médica/ })).toBeVisible();
    await expectAccessible(page);

    await page.goto('/medicos/1', { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Lucía Paredes' })).toBeVisible();
    await expectAccessible(page);
  });
});

test.describe('páginas públicas con sesión', () => {
  test.use({ actor: 'PATIENT' });

  test('el encabezado lleva al portal del actor y reservar va directo al flujo', async ({ page, api }) => {
    for (const [key, fixture] of Object.entries({
      'GET /doctors/:id': { id: 1, profile: { name: 'Lucía', lastName: 'Paredes' }, specialties: [], clinicId: 1, clinic: { id: 1, name: 'Sede Miraflores', timezone: 'America/Lima', currency: 'PEN' } },
    }))
      api.on(key, fixture);

    await page.goto('/medicos/1', { timeout: 30_000 });

    await expect(page.getByRole('banner').getByRole('link', { name: 'Ir a mi portal' })).toHaveAttribute('href', '/patient');
    await expect(page.getByRole('link', { name: 'Reservar con este médico' })).toHaveAttribute('href', '/patient/book?doctorId=1');
  });
});
