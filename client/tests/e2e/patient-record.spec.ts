import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import type { ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';

/** Expediente tal como lo devuelve GraphQL (`patientRecord` / `myPatientRecord`). */
const record = {
  id: 7,
  bloodType: 'O+',
  allergies: 'Penicilina, Mariscos',
  chronicConditions: 'Hipertensión',
  emergencyContact: 'Rosa Torres · 987 654 321',
  isActive: true,
  profile: {
    name: 'Ana',
    lastName: 'Torres',
    email: 'ana.torres@test.local',
    phone: '+51 999 111 222',
    birthday: '1990-05-14T00:00:00.000Z',
    gender: 'F',
    address: 'Av. Larco 1150, Miraflores',
    typeDocument: 'DNI',
    numberDocument: '40001371',
  },
  medicalHistory: [
    { condition: 'Hipertensión arterial', description: 'Controlada con losartán', diagnosedDate: '2024-03-10T00:00:00.000Z', status: 'CHRONIC', notes: null },
    { condition: 'Faringitis', description: null, diagnosedDate: '2025-11-02T00:00:00.000Z', status: 'RESOLVED', notes: null },
  ],
  // El servidor guarda la hora sobre 1970-01-01; el día viene del cupo.
  appointments: [
    {
      id: 31,
      startTime: '1970-01-01T09:30:00.000Z',
      status: 'COMPLETED',
      reason: 'Control de presión',
      schedule: { scheduleDate: '2026-08-20T00:00:00.000Z', doctor: { name: 'Lucía', lastName: 'Paredes' } },
      clinicalNotes: [{ diagnosis: 'Hipertensión controlada', plan: 'Seguir con losartán 50 mg' }],
    },
    {
      id: 32,
      startTime: '1970-01-01T11:00:00.000Z',
      status: 'CANCELLED',
      reason: null,
      schedule: { scheduleDate: '2026-10-05T00:00:00.000Z', doctor: { name: 'Lucía', lastName: 'Paredes' } },
      clinicalNotes: [],
    },
    {
      id: 33,
      startTime: '1970-01-01T08:00:00.000Z',
      status: 'NO_SHOW',
      reason: 'Dolor de garganta',
      schedule: { scheduleDate: '2026-09-12T00:00:00.000Z', doctor: { name: 'Bruno', lastName: 'Salazar' } },
      clinicalNotes: [],
    },
  ],
};

const gql = (field: string, value: unknown) => ({ data: { [field]: value } });

/** Las tres pestañas del expediente y el contenido clave de cada una. */
async function walkTabs(page: Page) {
  const main = page.locator('#main-content');
  await expect(main.getByRole('heading', { name: 'Ana Torres' })).toBeVisible({ timeout: 15_000 });
  await expect(main.getByText('DNI 40001371')).toBeVisible();
  await expect(main.getByText('Rosa Torres · 987 654 321')).toBeVisible();

  const tabs = main.getByRole('tablist', { name: 'Secciones del expediente' });
  await expect(tabs.getByRole('tab')).toHaveText(['Resumen', 'Antecedentes', 'Citas']);
  await expect(main.getByText('Penicilina')).toBeVisible();
  await expectAccessible(page);

  await tabs.getByRole('tab', { name: 'Antecedentes' }).click();
  await expect(main.getByText('Hipertensión arterial')).toBeVisible();
  await expectAccessible(page);

  await tabs.getByRole('tab', { name: 'Citas' }).click();
  const items = main.getByRole('list', { name: 'Citas del paciente' }).getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('5 oct 2026');
  await expect(items.nth(0)).toContainText('Cancelada');
  await expect(items.nth(1)).toContainText('Inasistencia');
  await expect(items.nth(2)).toContainText('Hipertensión controlada');
  await expect(items.nth(2)).toContainText('09:30');
  await expectAccessible(page);
}

test.describe('expediente del paciente', () => {
  test.use({ actor: 'PATIENT' });

  test('el paciente ve su expediente con resumen, antecedentes y citas en orden', async ({ page, api }) => {
    api.on('GQL myPatientRecord', gql('myPatientRecord', record));

    await page.goto('/patient/expediente', { timeout: 30_000 });

    await walkTabs(page);
  });

  test('si GraphQL responde con errores se muestra el mensaje', async ({ page, api }) => {
    api.on('GQL myPatientRecord', { data: null, errors: [{ message: 'Paciente no encontrado' }] });

    await page.goto('/patient/expediente', { timeout: 30_000 });

    await expect(page.locator('#main-content').getByRole('alert')).toContainText('Error al cargar el expediente clínico');
  });

  test('un paciente que abre la ruta del personal vuelve a su inicio sin pedir otro expediente', async ({ page, api }) => {
    let asked = 0;
    api.on('GQL patientRecord', () => {
      asked += 1;
      return gql('patientRecord', record);
    });
    api.on('GET /appointments/my/summary', {
      nextAppointment: null,
      upcomingCount: 0,
      awaitingPaymentCount: 0,
      earliestPaymentDeadline: null,
      completedCount: 0,
      pendingReviewCount: 0,
    });
    api.on('GET /appointments/my', { totalRows: 0, totalPages: 1, currentPage: 1, rows: [] });

    await page.goto('/patients/7', { timeout: 30_000 });

    await expect(page).toHaveURL(/\/patient$/, { timeout: 15_000 });
    expect(asked).toBe(0);
  });
});

test.describe('expediente desde el personal', () => {
  test.use({ actor: 'DOCTOR' });

  test('el médico abre el expediente de un paciente con la misma vista', async ({ page, api }) => {
    let variables: unknown;
    api.on('GQL patientRecord', ({ body }: ApiRequest) => {
      variables = (body as { variables: unknown }).variables;
      return gql('patientRecord', record);
    });

    await page.goto('/patients/7', { timeout: 30_000 });

    await walkTabs(page);
    expect(variables).toEqual({ id: 7 });
  });
});

test.describe('lista de pacientes', () => {
  test.use({ actor: 'RECEPTIONIST' });

  test('cada fila enlaza al expediente del paciente', async ({ page, api }) => {
    api.on('GET /patients', {
      totalRows: 1,
      totalPages: 1,
      currentPage: 1,
      rows: [
        {
          id: 7,
          emergencyContact: record.emergencyContact,
          bloodType: 'O+',
          allergies: null,
          chronicConditions: null,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          profile: { id: 70, ...record.profile, address: undefined },
        },
      ],
    });

    await page.goto('/patients', { timeout: 30_000 });

    await expect(page.getByRole('link', { name: 'Ver expediente de Ana Torres' })).toHaveAttribute('href', '/patients/7');
  });
});
