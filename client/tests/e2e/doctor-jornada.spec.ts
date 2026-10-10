import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { reply, type ApiRequest } from '../support/api';
import { expect, test } from '../support/fixtures';
import {
  agendaAppointment,
  agendaSnapshot,
  clinicalNote,
  cupo,
  doctorDaily,
  jornada,
  jornadaSnapshot,
  today,
} from './doctor-fixtures';

/** Fila de la lista de citas de hoy. */
const row = (page: Page, name: string) =>
  page.getByRole('region', { name: 'Citas de hoy' }).getByRole('button', { name: new RegExp(name) });

const panel = (page: Page) => page.getByRole('region', { name: 'Espacio de atención' });

test.describe('jornada del médico', () => {
  test.use({ actor: 'DOCTOR' });

  let agendaQueries: string[];
  let snapshot: ReturnType<typeof jornadaSnapshot>;

  test.beforeEach(({ api }) => {
    agendaQueries = [];
    snapshot = jornadaSnapshot();
    api.on('GET /agenda', ({ query }: ApiRequest) => {
      agendaQueries.push(query.toString());
      return snapshot;
    });
    api.on('GET /appointments/doctor/today', doctorDaily());
    api.on('GET /clinical-notes/appointment/:id', [clinicalNote()]);
    api.on('GET /prescriptions/appointment/:id', reply(404, { message: 'Receta no encontrada' }));
  });

  test('lista las citas de hoy por hora con sus estados y muestra los indicadores de la agenda', async ({ page }) => {
    await page.goto('/doctor', { timeout: 30_000 });

    await expect(page.getByRole('heading', { level: 1, name: 'Jornada de hoy' })).toBeVisible();
    expect(agendaQueries[0]).toBe(`from=${today}&to=${today}`);

    const names = page.getByRole('region', { name: 'Citas de hoy' }).getByRole('button');
    await expect(names).toHaveCount(5);
    const order = await names.allTextContents();
    expect(order.map((t) => /Bruno|Carla|Diego|Fernando|Ana/.exec(t)?.[0])).toEqual(['Bruno', 'Carla', 'Diego', 'Fernando', 'Ana']);
    await expect(row(page, 'Bruno Salazar')).toContainText('En riesgo');
    await expect(row(page, 'Fernando Ríos')).toContainText('Pago pendiente');
    await expect(row(page, 'Diego Herrera')).toContainText('Completada');

    const indicators = page.getByRole('region', { name: 'Indicadores de hoy' });
    await expect(indicators.getByText('50 %')).toBeVisible();
    await expect(indicators.getByText('3 de 6 cupos')).toBeVisible();
    await expect(indicators.getByText('2 confirmadas por atender')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toHaveAttribute('href', '/doctor/agenda');
    await expectAccessible(page);
  });

  test('la cita en curso se abre sola con su motivo y notas; guardar una nota la agrega', async ({ page, api }) => {
    let noteBody: unknown;
    let notes = [clinicalNote()];
    api.on('GET /clinical-notes/appointment/:id', () => notes);
    api.on('POST /clinical-notes', ({ body }: ApiRequest) => {
      noteBody = body;
      notes = [...notes, clinicalNote({ id: 71, diagnosis: 'Control en 48 horas' })];
      return notes.at(-1);
    });

    await page.goto('/doctor', { timeout: 30_000 });

    const attention = panel(page);
    await expect(attention.getByRole('heading', { name: 'Carla Gómez' })).toBeVisible();
    await expect(attention.getByText('Motivo: Fiebre y tos hace 3 días')).toBeVisible();
    await expect(attention.getByText('Faringitis aguda')).toBeVisible();

    await attention.getByLabel('Diagnóstico').fill('Control en 48 horas');
    await attention.getByRole('button', { name: 'Guardar nota' }).click();

    await expect(attention.getByText('Control en 48 horas')).toBeVisible();
    expect(noteBody).toEqual({ appointmentId: 3, diagnosis: 'Control en 48 horas' });

    await attention.getByRole('tab', { name: 'Receta' }).click();
    await expect(attention.getByRole('button', { name: 'Guardar receta' })).toBeVisible();
    await expectAccessible(page);
  });

  test('completar la atención cambia el estado en la lista', async ({ page, api }) => {
    api.on('PATCH /appointments/:id/complete', () => {
      snapshot = jornadaSnapshot({ appointments: [jornada.ana, jornada.diego, jornada.bruno, jornada.fernando, { ...jornada.carla, status: 'COMPLETED' }] });
      return { ...doctorDaily()[0], status: 'COMPLETED' };
    });

    await page.goto('/doctor', { timeout: 30_000 });
    await panel(page).getByRole('button', { name: 'Completar atención' }).click();

    await expect(row(page, 'Carla Gómez')).toContainText('Completada');
    await expect(panel(page).getByRole('button', { name: 'Completar atención' })).toHaveCount(0);
  });

  test('el médico marca la llegada de una cita confirmada de hoy', async ({ page, api }) => {
    let checkedIn = 0;
    api.on('PATCH /appointments/:id/check-in', ({ path }: ApiRequest) => {
      checkedIn = Number(path.split('/')[2]);
      snapshot = jornadaSnapshot({ appointments: [{ ...jornada.ana, status: 'IN_PROGRESS' }, jornada.diego, jornada.bruno, jornada.fernando, jornada.carla] });
      return { ...doctorDaily()[0], id: 1, status: 'IN_PROGRESS' };
    });

    await page.goto('/doctor', { timeout: 30_000 });
    await row(page, 'Ana Torres').click();
    const attention = panel(page);
    await expect(attention.getByRole('heading', { name: 'Ana Torres' })).toBeVisible();
    // Su hora todavía no llega: no se puede marcar inasistencia.
    await expect(attention.getByRole('button', { name: 'Inasistencia' })).toHaveCount(0);

    await attention.getByRole('button', { name: 'Marcar llegada' }).click();

    await expect(row(page, 'Ana Torres')).toContainText('En curso');
    expect(checkedIn).toBe(1);
    await expect(attention.getByRole('button', { name: 'Completar atención' })).toBeVisible();
  });

  test('una cita confirmada cuya hora ya pasó se marca como inasistencia', async ({ page, api }) => {
    api.on('PATCH /appointments/:id/no-show', () => {
      snapshot = jornadaSnapshot({ appointments: [jornada.ana, jornada.diego, { ...jornada.bruno, status: 'NO_SHOW' }, jornada.fernando, jornada.carla] });
      return { ...doctorDaily()[0], id: 2, status: 'NO_SHOW' };
    });

    await page.goto('/doctor', { timeout: 30_000 });
    await row(page, 'Bruno Salazar').click();
    await panel(page).getByRole('button', { name: 'Inasistencia' }).click();

    await expect(row(page, 'Bruno Salazar')).toContainText('Inasistencia');
  });

  test('si el servidor rechaza la acción, el panel muestra su mensaje', async ({ page, api }) => {
    api.on('PATCH /appointments/:id/check-in', reply(400, { message: 'No se puede hacer check-in. Estado actual: CANCELLED' }));

    await page.goto('/doctor', { timeout: 30_000 });
    await row(page, 'Ana Torres').click();
    await panel(page).getByRole('button', { name: 'Marcar llegada' }).click();

    await expect(panel(page).getByRole('alert')).toContainText('No se puede hacer check-in');
  });

  test('en celular se lee completa y accesible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/doctor', { timeout: 30_000 });

    await expect(row(page, 'Carla Gómez')).toBeVisible();
    await expectAccessible(page);
  });

  test('la ruta anterior de citas de hoy lleva a la jornada', async ({ page }) => {
    await page.goto('/doctor/appointments', { timeout: 30_000 });

    await expect(page).toHaveURL(/\/doctor$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Jornada de hoy' })).toBeVisible();
  });
});

test.describe('agenda del médico', () => {
  test.use({ actor: 'DOCTOR' });

  const ana = agendaAppointment({ startTime: '08:00', endTime: '08:30' });
  const carla = agendaAppointment({ id: 3, startTime: '09:00', endTime: '09:30', status: 'COMPLETED', patient: { id: 103, fullName: 'Carla Gómez' } });
  const weekAgenda = (from: string, to: string) =>
    agendaSnapshot({
      range: { from, to },
      cupos: [cupo('08:00', '08:30', false), cupo('08:30', '09:00', true), cupo('09:00', '09:30', false), cupo('09:30', '10:00', true)],
      appointments: [ana, carla],
      holidays: [{ id: 3, date: today, name: 'Aniversario de la sede', scope: 'CLINIC' }],
    });

  test.beforeEach(({ api }) => {
    api.on('GET /agenda', ({ query }: ApiRequest) => weekAgenda(query.get('from')!, query.get('to')!));
    api.on('GET /clinical-notes/appointment/:id', []);
    api.on('GET /prescriptions/appointment/:id', reply(404, { message: 'Receta no encontrada' }));
  });

  const event = (page: Page, name: string) => page.locator('.fc-event', { hasText: name });

  /** Arrastra el evento media hora hacia abajo (una franja de 30 min mide 3rem). */
  async function dragHalfHourDown(page: Page, name: string) {
    const box = (await event(page, name).boundingBox())!;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + 6);
    await page.mouse.down();
    await page.mouse.move(x, box.y + 30, { steps: 8 });
    await page.mouse.move(x, box.y + 54, { steps: 8 });
    await page.mouse.up();
  }

  test('muestra citas, cupos libres y el feriado de la sede; el interruptor oculta los cupos', async ({ page }) => {
    await page.goto('/doctor/agenda', { timeout: 30_000 });

    await expect(page.getByRole('heading', { level: 1, name: 'Mi agenda' })).toBeVisible();
    await expect(event(page, 'Ana Torres')).toBeVisible();
    await expect(page.locator('.fc-daygrid-bg-harness').getByText('Aniversario de la sede')).toBeVisible();
    await expect(page.locator('.fc-bg-event.cupo-libre')).toHaveCount(2);
    await expectAccessible(page);

    await page.getByLabel('Mostrar cupos libres').uncheck();
    await expect(page.locator('.fc-bg-event.cupo-libre')).toHaveCount(0);
  });

  test('arrastrar una cita confirmada a un cupo libre la reagenda con ese cupo', async ({ page, api }) => {
    let rescheduled: unknown;
    api.on('PATCH /appointments/:id/reschedule', ({ body }: ApiRequest) => {
      rescheduled = body;
      return { ...doctorDaily()[0], id: 1 };
    });

    await page.goto('/doctor/agenda', { timeout: 30_000 });
    await expect(event(page, 'Ana Torres')).toBeVisible();
    await dragHalfHourDown(page, 'Ana Torres');

    await expect(page.getByText('Cita reagendada')).toBeVisible();
    expect(rescheduled).toEqual({ newScheduleId: 40, startTime: '08:30', endTime: '09:00' });
  });

  test('si el cupo ya fue tomado, la cita vuelve a su lugar y se ve el mensaje', async ({ page, api }) => {
    api.on('PATCH /appointments/:id/reschedule', reply(409, { message: 'El horario se superpone con otra cita' }));

    await page.goto('/doctor/agenda', { timeout: 30_000 });
    await expect(event(page, 'Ana Torres')).toBeVisible();
    const before = (await event(page, 'Ana Torres').boundingBox())!.y;
    await dragHalfHourDown(page, 'Ana Torres');

    await expect(page.getByText('El horario se superpone con otra cita')).toBeVisible();
    await expect.poll(async () => (await event(page, 'Ana Torres').boundingBox())!.y).toBe(before);
  });

  test('una cita completada no se puede arrastrar', async ({ page }) => {
    await page.goto('/doctor/agenda', { timeout: 30_000 });

    await expect(event(page, 'Ana Torres')).toHaveClass(/fc-event-draggable/);
    await expect(event(page, 'Carla Gómez')).not.toHaveClass(/fc-event-draggable/);
  });

  test('tocar una cita abre el espacio de atención en un panel lateral', async ({ page }) => {
    await page.goto('/doctor/agenda', { timeout: 30_000 });
    await event(page, 'Ana Torres').click();

    const drawer = page.getByRole('dialog', { name: 'Espacio de atención' });
    await expect(drawer.getByRole('heading', { name: 'Ana Torres' })).toBeVisible();
    await expect(drawer.getByText(/08:00–08:30 · Cardiología/)).toBeVisible();
    await expectAccessible(page);

    await drawer.getByRole('button', { name: 'Cerrar' }).click();
    await expect(drawer).toBeHidden();
  });
});
