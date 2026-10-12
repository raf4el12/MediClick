import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import { page as paged, patientAppointment } from './patient-fixtures';

const ana = patientAppointment({
  id: 101,
  status: 'COMPLETED',
  patient: { id: 7, name: 'Ana', lastName: 'Torres', email: 'ana@test.local' },
  notesCount: 1,
});
const bruno = patientAppointment({
  id: 102,
  status: 'CONFIRMED',
  patient: { id: 8, name: 'Bruno', lastName: 'Salazar', email: 'bruno@test.local' },
});

const note = (overrides: Record<string, unknown> = {}) => ({
  id: 70,
  appointmentId: 101,
  summary: null,
  diagnosis: 'Faringitis aguda',
  plan: null,
  patient: { id: 7, name: 'Ana', lastName: 'Torres' },
  scheduleDate: '2026-10-10T00:00:00.000Z',
  createdAt: '2026-10-10T15:00:00.000Z',
  ...overrides,
});

const main = (page: Page) => page.locator('#main-content');

test.describe('notas clínicas', () => {
  test.use({ actor: 'DOCTOR' });

  test('elegir una cita abre el drawer con sus notas y guardar una nota recarga panel y tabla', async ({ page, api }) => {
    const appointmentQueries: string[] = [];
    let notes = [note()];
    let created: unknown;
    api.on('GET /appointments', ({ query }: ApiRequest) => {
      appointmentQueries.push(query.toString());
      return paged([ana, bruno]);
    });
    api.on('GET /clinical-notes/appointment/:id', () => notes);
    api.on('POST /clinical-notes', ({ body }: ApiRequest) => {
      created = body;
      notes = [...notes, note({ id: 71, diagnosis: 'Control en 48 horas' })];
      return notes.at(-1);
    });

    await page.goto('/clinical-notes', { timeout: 30_000 });
    await expect(main(page).getByRole('heading', { level: 1, name: 'Notas clínicas' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Citas' }).getByText('Ana Torres')).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Ver notas de Ana Torres' }).click();
    const drawer = page.getByRole('dialog', { name: 'Notas clínicas' });
    await expect(drawer.getByRole('heading', { name: 'Ana Torres' })).toBeVisible();
    await expect(drawer.getByText('Faringitis aguda')).toBeVisible();
    await expect(page).toHaveURL(/\?appointmentId=101$/);
    await expectAccessible(page);

    const loadsBefore = appointmentQueries.length;
    await drawer.getByLabel('Diagnóstico').fill('Control en 48 horas');
    await drawer.getByRole('button', { name: 'Guardar nota' }).click();

    await expect(drawer.getByText('Control en 48 horas')).toBeVisible();
    expect(created).toEqual({ appointmentId: 101, diagnosis: 'Control en 48 horas' });
    await expect.poll(() => appointmentQueries.length).toBeGreaterThan(loadsBefore);

    await drawer.getByRole('button', { name: 'Cerrar' }).click();
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/\/clinical-notes$/);
  });

  test('la URL con ?appointmentId= abre el drawer al cargar', async ({ page, api }) => {
    api.on('GET /appointments', paged([ana, bruno]));
    api.on('GET /clinical-notes/appointment/:id', [note()]);

    await page.goto('/clinical-notes?appointmentId=101', { timeout: 30_000 });

    await expect(page.getByRole('dialog', { name: 'Notas clínicas' }).getByText('Faringitis aguda')).toBeVisible();
  });
});

test.describe('recetas', () => {
  test.use({ actor: 'DOCTOR' });

  test('crear una receta envía sus medicamentos y luego se puede descargar el PDF', async ({ page, api }) => {
    let created: { appointmentId: number; items: unknown[] } | undefined;
    let pdfRequested = false;
    api.on('GET /appointments', paged([ana, bruno]));
    api.on('GET /prescriptions/appointment/:id', () =>
      created
        ? {
            id: 5,
            appointmentId: 101,
            instructions: null,
            validUntil: null,
            items: [{ id: 1, medication: 'Amoxicilina 500 mg', dosage: '1 cápsula', frequency: 'Cada 8 horas', duration: '7 días', notes: null }],
            patient: { id: 7, name: 'Ana', lastName: 'Torres' },
            doctor: { id: 200, name: 'Gregorio', lastName: 'Médico' },
            specialtyName: 'Cardiología',
            scheduleDate: '2026-10-10T00:00:00.000Z',
            appointmentStatus: 'COMPLETED',
            createdAt: '2026-10-10T15:00:00.000Z',
          }
        : reply(404, { message: 'Receta no encontrada' }),
    );
    api.on('POST /prescriptions', ({ body }: ApiRequest) => {
      created = body as typeof created;
      return { id: 5 };
    });
    api.on('GET /prescriptions/appointment/:id/pdf', () => {
      pdfRequested = true;
      return 'pdf';
    });

    await page.goto('/prescriptions', { timeout: 30_000 });
    await expect(main(page).getByRole('heading', { level: 1, name: 'Recetas' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver receta de Ana Torres' }).click();

    const drawer = page.getByRole('dialog', { name: 'Receta' });
    await expect(drawer.getByRole('heading', { name: 'Ana Torres' })).toBeVisible();
    await drawer.getByLabel('Medicamento', { exact: true }).fill('Amoxicilina 500 mg');
    await drawer.getByLabel('Dosis', { exact: true }).fill('1 cápsula');
    await drawer.getByLabel('Frecuencia', { exact: true }).fill('Cada 8 horas');
    await drawer.getByLabel('Duración', { exact: true }).fill('7 días');
    await expectAccessible(page);
    await drawer.getByRole('button', { name: 'Crear receta' }).click();

    await expect(drawer.getByText('Amoxicilina 500 mg')).toBeVisible();
    expect(created).toEqual({
      appointmentId: 101,
      items: [{ medication: 'Amoxicilina 500 mg', dosage: '1 cápsula', frequency: 'Cada 8 horas', duration: '7 días' }],
    });

    await drawer.getByRole('button', { name: 'Descargar PDF' }).click();
    await expect.poll(() => pdfRequested).toBe(true);
  });
});

test.describe('historial médico', () => {
  test.use({ actor: 'DOCTOR' });

  const patient = {
    id: 7,
    emergencyContact: '+51912345678',
    bloodType: 'O+',
    allergies: null,
    chronicConditions: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    profile: { id: 70, name: 'Ana', lastName: 'Torres', email: 'ana@test.local', phone: null, birthday: null, gender: 'F' },
  };
  const entry = (id: number, status: string, condition: string) => ({
    id,
    patientId: 7,
    condition,
    description: null,
    diagnosedDate: '2025-03-01T00:00:00.000Z',
    status,
    notes: null,
    patient: { id: 7, name: 'Ana', lastName: 'Torres' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
  });

  test('elegir un paciente carga su lista y sus tarjetas; cambiar el estado envía el estado nuevo', async ({ page, api }) => {
    let statusBody: unknown;
    let statusPath = '';
    api.on('GET /patients', { totalRows: 1, totalPages: 1, currentPage: 1, rows: [patient] });
    api.on('GET /medical-history/patient/:id', {
      data: [entry(1, 'ACTIVE', 'Hipertensión arterial'), entry(2, 'CHRONIC', 'Diabetes tipo 2'), entry(3, 'RESOLVED', 'Neumonía')],
      total: 3,
      page: 1,
      limit: 12,
      totalPages: 1,
    });
    api.on('PATCH /medical-history/:id/status', ({ body, path }: ApiRequest) => {
      statusBody = body;
      statusPath = path;
      return entry(1, 'RESOLVED', 'Hipertensión arterial');
    });

    await page.goto('/medical-history', { timeout: 30_000 });
    await expect(main(page).getByRole('heading', { level: 1, name: 'Historial médico' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva entrada' })).toBeDisabled();
    await expect(page.getByText('Elige un paciente para ver su historial médico.')).toBeVisible();

    await page.getByRole('combobox', { name: 'Paciente' }).fill('Ana');
    await page.getByRole('option', { name: 'Ana Torres' }).click();

    const cards = page.getByRole('region', { name: 'Resumen del historial' });
    await expect(cards.getByText('Activas')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Historial médico' }).getByText('Diabetes tipo 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva entrada' })).toBeEnabled();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Cambiar estado de Hipertensión arterial' }).click();
    await page.getByRole('menuitem', { name: 'Resuelta' }).click();

    await expect.poll(() => statusBody).toEqual({ status: 'RESOLVED' });
    expect(statusPath).toBe('/medical-history/1/status');
  });
});

test.describe('pantallas clínicas: el paciente no entra', () => {
  test.use({ actor: 'PATIENT' });

  for (const path of ['/clinical-notes', '/prescriptions', '/medical-history']) {
    test(`${path} lo devuelve a su inicio sin pedir datos ajenos`, async ({ page }) => {
      await page.goto(path, { timeout: 30_000 });

      await expect(page).toHaveURL(/\/patient$/, { timeout: 15_000 });
    });
  }
});
