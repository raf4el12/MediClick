import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import { bookingRoutes } from './booking-fixtures';

const patients = [
  {
    id: 7,
    emergencyContact: '',
    bloodType: 'O+',
    allergies: null,
    chronicConditions: null,
    isActive: true,
    createdAt: '2026-01-01',
    profile: { id: 70, name: 'Ana', lastName: 'Torres', email: 'ana@test.local', phone: null, birthday: null, gender: null, typeDocument: 'DNI', numberDocument: '45871236' },
  },
];

const emptyPage = { totalRows: 0, totalPages: 0, currentPage: 1, rows: [] };

test.describe('creación administrativa', () => {
  test.use({ actor: 'RECEPTIONIST' });

  test('recepción crea una cita buscando al paciente primero', async ({ page, api }) => {
    let listLoads = 0;
    let created: unknown;
    for (const [key, fixture] of Object.entries(bookingRoutes())) api.on(key, fixture);
    api.on('GET /appointments', () => {
      listLoads += 1;
      return emptyPage;
    });
    api.on('GET /patients', ({ query }: ApiRequest) => ({
      ...emptyPage,
      rows: patients.filter((p) => `${p.profile.name} ${p.profile.lastName}`.toLowerCase().includes((query.get('searchValue') ?? '').toLowerCase())),
    }));
    api.on('POST /appointments', ({ body }: ApiRequest) => {
      created = body;
      return { id: 900 };
    });

    await page.goto('/appointments');
    await page.getByRole('button', { name: 'Nueva Cita' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Nueva cita' });

    await dialog.getByRole('combobox', { name: 'Paciente' }).fill('zz');
    await expect(page.getByText('No encontramos pacientes con «zz»')).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Paciente' }).fill('ana');
    await page.getByRole('option', { name: /Ana Torres/ }).click();

    await dialog.getByRole('combobox', { name: 'Especialidad' }).click();
    await page.getByRole('option', { name: 'Cardiología' }).click();
    await dialog.getByRole('combobox', { name: 'Médico' }).click();
    await page.getByRole('option', { name: 'Lucía Paredes' }).click();
    await dialog.getByRole('button', { name: '09:00' }).click();
    await expect(dialog.getByText('S/ 150.00')).toBeVisible();
    await expectAccessible(page);

    const loadsBefore = listLoads;
    await dialog.getByRole('button', { name: 'Crear cita' }).click();

    await expect(page.getByText('Cita creada')).toBeVisible();
    expect(created).toEqual({ patientId: 7, scheduleId: 10, startTime: '09:00', endTime: '09:30' });
    await expect.poll(() => listLoads).toBeGreaterThan(loadsBefore);
  });
});
