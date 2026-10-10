import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import {
  agenda,
  appointment,
  block,
  doctorsPage,
  holiday,
  impact,
  impactedAppointment,
  monday,
  next,
  rule,
  rulesPage,
  sunday,
  today,
} from './availability-fixtures';
import { limaDay } from './booking-fixtures';

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Bloqueo de agenda' });

async function chooseDoctor(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Médico' }).click();
  await page.getByRole('option', { name }).click();
}

async function chooseSpecialty(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Especialidad' }).click();
  await page.getByRole('option', { name }).click();
}

/** Arrastra en la columna de `date` desde `from` hasta `to` empezando en un hueco vacío. */
async function selectRange(page: Page, date: string, from: string, to: string) {
  const col = (await page.locator(`.fc-timegrid-col[data-date="${date}"]`).boundingBox())!;
  const a = (await page.locator(`.fc-timegrid-slot-lane[data-time="${from}:00"]`).boundingBox())!;
  const b = (await page.locator(`.fc-timegrid-slot-lane[data-time="${to}:00"]`).boundingBox())!;
  const x = col.x + col.width / 2;
  await page.mouse.move(x, a.y + 3);
  await page.mouse.down();
  await page.mouse.move(x, b.y - 3, { steps: 10 });
  await page.mouse.up();
}

test.describe('disponibilidad: calendario de recepción', () => {
  test.use({ actor: 'RECEPTIONIST' });

  let agendaQueries: string[];
  let impactQueries: string[];

  test.beforeEach(({ api }) => {
    agendaQueries = [];
    impactQueries = [];
    api.on('GET /doctors', doctorsPage);
    api.on('GET /agenda', ({ query }: ApiRequest) => {
      agendaQueries.push(query.toString());
      return agenda(query.get('from')!, query.get('to')!);
    });
    api.on('GET /availability-restrictions/impact', ({ query }: ApiRequest) => {
      impactQueries.push(query.toString());
      return impact([impactedAppointment()]);
    });
    api.on('GET /availability', rulesPage([]));
  });

  test('seleccionar un rango horario crea un bloqueo por horas tras ver las citas afectadas', async ({ page, api }) => {
    let created: unknown;
    api.on('POST /schedule-blocks', ({ body }: ApiRequest) => {
      created = body;
      return { ...block({ id: 9 }), ...(body as object) };
    });

    await page.goto('/availability', { timeout: 30_000 });
    await expect(page.locator('#main-content').getByRole('heading', { level: 1, name: 'Disponibilidad' })).toBeVisible();
    await chooseDoctor(page, 'Lucía Paredes');
    await expect(page.locator('.fc-event', { hasText: 'Ana Torres' })).toBeVisible();
    expect(agendaQueries.at(-1)).toBe(`doctorId=12&from=${monday}&to=${sunday}`);
    await expect(page.getByText('12 cupos ofrecidos · 5 reservados')).toBeVisible();
    await expectAccessible(page);

    await selectRange(page, today, '07:00', '09:00');
    const form = drawer(page);
    await expect(form.getByRole('heading', { name: 'Nuevo bloqueo de agenda' })).toBeVisible();
    await expect(form.getByLabel('Por horas')).toBeChecked();
    await expect(form.getByLabel('Hora de inicio')).toHaveValue('07:00');
    await expect(form.getByLabel('Hora de fin')).toHaveValue('09:00');
    await expect(form.getByText('1 cita se cancelaría; 1 con pago queda con reembolso pendiente.')).toBeVisible();
    await expect(form.getByText('Ana Torres')).toBeVisible();
    expect(impactQueries.at(-1)).toBe(`type=TIME_RANGE&doctorId=12&startDate=${today}&endDate=${today}&timeFrom=07%3A00&timeTo=09%3A00`);
    await expectAccessible(page);

    await form.getByLabel('Motivo').fill('Capacitación');
    await form.getByRole('button', { name: 'Crear bloqueo' }).click();

    await expect(page.getByText('Bloqueo creado')).toBeVisible();
    expect(created).toEqual({ doctorId: 12, type: 'TIME_RANGE', startDate: today, endDate: today, timeFrom: '07:00', timeTo: '09:00', reason: 'Capacitación' });
    await expect(form).toBeHidden();
  });

  test('tocar el día en la fila "Todo el día" crea un bloqueo de día completo', async ({ page, api }) => {
    let created: unknown;
    api.on('POST /schedule-blocks', ({ body }: ApiRequest) => {
      created = body;
      return block({ id: 9, type: 'FULL_DAY', timeFrom: null, timeTo: null });
    });

    await page.goto('/availability', { timeout: 30_000 });
    await chooseDoctor(page, 'Lucía Paredes');
    await page.locator(`.fc-timegrid .fc-daygrid-day[data-date="${today}"]`).click();

    const form = drawer(page);
    await expect(form.getByLabel('Día completo')).toBeChecked();
    await expect(form.getByLabel('Hora de inicio')).toHaveCount(0);
    await form.getByLabel('Motivo').fill('Vacaciones');
    await form.getByRole('button', { name: 'Crear bloqueo' }).click();

    await expect.poll(() => created).toEqual({ doctorId: 12, type: 'FULL_DAY', startDate: today, endDate: today, reason: 'Vacaciones' });
  });

  test('tocar un bloqueo lo edita sin contar su propio rango, y se puede eliminar', async ({ page, api }) => {
    let patched: unknown;
    let deleted = false;
    api.on('PATCH /schedule-blocks/:id', ({ body }: ApiRequest) => {
      patched = body;
      return { ...block(), ...(body as object) };
    });
    api.on('DELETE /schedule-blocks/:id', () => {
      deleted = true;
      return {};
    });

    await page.goto('/availability', { timeout: 30_000 });
    await chooseDoctor(page, 'Lucía Paredes');
    await page.locator('.fc-event', { hasText: 'Reunión de servicio' }).click();

    const form = drawer(page);
    await expect(form.getByRole('heading', { name: 'Editar bloqueo de agenda' })).toBeVisible();
    await expect(form.getByLabel('Motivo')).toHaveValue('Reunión de servicio');
    await form.getByLabel('Hora de fin').fill('11:30');
    await expect.poll(() => impactQueries.at(-1)).toContain('timeTo=11%3A30&excludeRestrictionId=7');
    await form.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Bloqueo actualizado')).toBeVisible();
    expect(patched).toEqual({ type: 'TIME_RANGE', startDate: today, endDate: today, timeFrom: '10:00', timeTo: '11:30', reason: 'Reunión de servicio' });

    await page.locator('.fc-event', { hasText: 'Reunión de servicio' }).click();
    await drawer(page).getByRole('button', { name: 'Eliminar bloqueo' }).click();
    await page.getByRole('dialog', { name: 'Eliminar el bloqueo' }).getByRole('button', { name: 'Eliminar' }).click();
    await expect.poll(() => deleted).toBe(true);
  });

  test('si el servidor rechaza el bloqueo, el drawer muestra su mensaje y sigue abierto', async ({ page, api }) => {
    api.on('POST /schedule-blocks', reply(403, { message: 'No puede bloquear la agenda de un médico de otra sede' }));

    await page.goto('/availability', { timeout: 30_000 });
    await chooseDoctor(page, 'Lucía Paredes');
    await page.locator(`.fc-timegrid .fc-daygrid-day[data-date="${today}"]`).click();
    const form = drawer(page);
    await form.getByLabel('Motivo').fill('Vacaciones');
    await form.getByRole('button', { name: 'Crear bloqueo' }).click();

    await expect(form.getByRole('alert')).toContainText('No puede bloquear la agenda de un médico de otra sede');
    await expect(form.getByLabel('Motivo')).toHaveValue('Vacaciones');
  });

  test('"Todos los médicos" muestra la semana de la sede y filtra por especialidad', async ({ page }) => {
    await page.goto('/availability', { timeout: 30_000 });
    await chooseDoctor(page, 'Todos los médicos');

    await expect(page.locator('.fc-event', { hasText: 'Lucía Paredes · Ana Torres' })).toBeVisible();
    expect(agendaQueries.at(-1)).toBe(`from=${monday}&to=${sunday}`);

    await page.getByRole('button', { name: 'Semana siguiente' }).click();
    await expect.poll(() => agendaQueries.at(-1)).toBe(`from=${limaDay(7 - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7))}&to=${limaDay(13 - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7))}`);
    await page.getByRole('button', { name: 'Semana anterior' }).click();

    await chooseSpecialty(page, 'Medicina General');
    await expect(page.locator('.fc-event', { hasText: 'Ana Torres' })).toHaveCount(0);
  });
});

test.describe('disponibilidad: navegador en otra zona horaria', () => {
  test.use({ actor: 'RECEPTIONIST', timezoneId: 'Asia/Tokyo' });

  test('la semana se calcula en la zona de la sede', async ({ page, api }) => {
    const queries: string[] = [];
    api.on('GET /doctors', doctorsPage);
    api.on('GET /availability', rulesPage([]));
    api.on('GET /agenda', ({ query }: ApiRequest) => {
      queries.push(query.toString());
      return agenda(query.get('from')!, query.get('to')!);
    });

    await page.goto('/availability', { timeout: 30_000 });
    await chooseDoctor(page, 'Lucía Paredes');

    await expect.poll(() => queries[0]).toBe(`doctorId=12&from=${monday}&to=${sunday}`);
  });
});

test.describe('disponibilidad: reglas semanales', () => {
  test.use({ actor: 'RECEPTIONIST' });

  test('las reglas son de la especialidad elegida y guardarlas avisa qué citas quedan fuera', async ({ page, api }) => {
    let saved: { doctorId: number; specialtyId: number; entries: Array<Record<string, string>> } | undefined;
    api.on('GET /doctors', doctorsPage);
    api.on('GET /availability', rulesPage([rule(), rule({ id: 2, specialtyId: 1, dayOfWeek: 'MONDAY', timeFrom: '08:00', timeTo: '12:00', specialty: { id: 1, name: 'Medicina General' } })]));
    api.on('GET /agenda', ({ query }: ApiRequest) =>
      agenda(query.get('from')!, query.get('to')!, {
        appointments: [
          appointment({ id: 20, date: next(1), startTime: '15:00', endTime: '15:30', patient: { id: 120, fullName: 'Carla Gómez' } }),
          appointment({ id: 21, date: next(2), startTime: '09:00', endTime: '09:30', patient: { id: 121, fullName: 'Javier Ortiz' } }),
        ],
      }),
    );
    api.on('POST /availability/bulk-save', ({ body }: ApiRequest) => {
      saved = body as typeof saved;
      return [];
    });

    await page.goto('/availability', { timeout: 30_000 });
    await chooseDoctor(page, 'Lucía Paredes');
    await page.getByRole('tab', { name: 'Reglas' }).click();
    await chooseSpecialty(page, 'Cardiología');

    await expect(page.getByRole('switch', { name: 'Martes' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Lunes' })).not.toBeChecked();
    await expect(page.getByLabel('Vigente desde')).toHaveValue('2026-10-01');
    await expectAccessible(page);

    await page.getByRole('switch', { name: 'Jueves' }).check();
    await page.getByRole('button', { name: 'Guardar reglas' }).click();

    const confirm = page.getByRole('dialog', { name: 'Guardar reglas de disponibilidad' });
    await expect(confirm.getByText('Javier Ortiz')).toBeVisible();
    await expect(confirm.getByText('Carla Gómez')).toHaveCount(0);
    await confirm.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Reglas guardadas')).toBeVisible();
    expect(saved?.doctorId).toBe(12);
    expect(saved?.specialtyId).toBe(2);
    expect(saved?.entries).toEqual([
      { startDate: '2026-10-01', endDate: '2026-12-31', dayOfWeek: 'TUESDAY', timeFrom: '14:00', timeTo: '18:00', type: 'REGULAR' },
      { startDate: '2026-10-01', endDate: '2026-12-31', dayOfWeek: 'THURSDAY', timeFrom: '08:00', timeTo: '14:00', type: 'REGULAR' },
    ]);
  });
});

test.describe('disponibilidad: el médico solo mira', () => {
  test.use({ actor: 'DOCTOR' });

  test('ve su calendario y sus reglas sin acciones de edición', async ({ page, api }) => {
    api.on('GET /agenda', ({ query }: ApiRequest) => agenda(query.get('from')!, query.get('to')!));
    api.on('GET /availability', rulesPage([rule()]));

    await page.goto('/availability', { timeout: 30_000 });

    await expect(page.locator('.fc-event', { hasText: 'Ana Torres' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Médico' })).toHaveCount(0);
    await page.locator(`.fc-timegrid .fc-daygrid-day[data-date="${today}"]`).click();
    await expect(drawer(page)).toHaveCount(0);

    await page.getByRole('tab', { name: 'Reglas' }).click();
    await chooseSpecialty(page, 'Cardiología');
    await expect(page.getByRole('switch', { name: 'Martes' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Guardar reglas' })).toHaveCount(0);
  });
});

test.describe('feriados', () => {
  test.use({ actor: 'RECEPTIONIST' });

  test('lista los feriados del año, crea uno de la sede tras ver su impacto y carga los de Perú', async ({ page, api }) => {
    let created: unknown;
    let seeded: unknown;
    const impactQueries: string[] = [];
    api.on('GET /holidays', ({ query }: ApiRequest) => (query.get('year') === '2026' ? rulesPage([holiday()]) : rulesPage([])));
    api.on('GET /availability-restrictions/impact', ({ query }: ApiRequest) => {
      impactQueries.push(query.toString());
      return impact([impactedAppointment({ date: '2026-12-24', paymentStatus: 'PENDING' })]);
    });
    api.on('POST /holidays', ({ body }: ApiRequest) => {
      created = body;
      return holiday({ id: 4, name: 'Nochebuena', date: '2026-12-24T00:00:00.000Z' });
    });
    api.on('POST /holidays/seed', ({ body }: ApiRequest) => {
      seeded = body;
      return { seeded: 12, year: 2026, message: 'ok' };
    });

    await page.goto('/holidays', { timeout: 30_000 });

    await expect(page.locator('#main-content').getByRole('heading', { level: 1, name: 'Feriados' })).toBeVisible();
    await expect(page.getByText('Aniversario de la sede')).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Nuevo feriado' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo feriado' });
    await dialog.getByLabel('Nombre').fill('Nochebuena');
    await dialog.getByLabel('Fecha').fill('2026-12-24');
    await expect(dialog.getByText('1 cita se cancelaría.')).toBeVisible();
    expect(impactQueries.at(-1)).toBe('type=HOLIDAY&startDate=2026-12-24&endDate=2026-12-24');
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Feriado creado')).toBeVisible();
    expect(created).toEqual({ name: 'Nochebuena', date: '2026-12-24', isRecurring: false });

    await page.getByRole('button', { name: 'Cargar feriados de Perú' }).click();
    await expect.poll(() => seeded).toEqual({ year: 2026 });
  });
});

test.describe('rutas anteriores', () => {
  test.use({ actor: 'RECEPTIONIST' });

  for (const path of ['/schedules', '/schedule-blocks']) {
    test(`${path} lleva a la disponibilidad`, async ({ page, api }) => {
      api.on('GET /doctors', doctorsPage);
      await page.goto(path, { timeout: 30_000 });
      await expect(page).toHaveURL(/\/availability$/);
    });
  }
});
