import type { Page } from '@playwright/test';
import { expectAccessible } from '../support/accessible';
import { expect, test } from '../support/fixtures';

const page = (totalRows: number) => ({ totalRows, totalPages: 1, currentPage: 1, rows: [] });

const summary = {
  total: 40,
  byStatus: { PENDING: 4, CONFIRMED: 10, IN_PROGRESS: 1, COMPLETED: 20, CANCELLED: 3, NO_SHOW: 2 },
  daily: [
    { date: '2026-10-01', count: 3 },
    { date: '2026-10-02', count: 5 },
    { date: '2026-10-05', count: 4 },
  ],
};
const occupancy = { totalSlots: 200, bookedSlots: 75, availableSlots: 125, occupancyRate: 37.5 };
const revenue = { actualRevenue: 4500, projectedRevenue: 6000, currency: 'PEN' };
const topDoctors = [
  { doctorId: 1, doctorName: 'Lucía Paredes', specialties: ['Cardiología'], completedAppointments: 12 },
  { doctorId: 2, doctorName: 'Gregorio Médico', specialties: ['Medicina General'], completedAppointments: 8 },
];

async function darkMode(page: Page) {
  await page.getByRole('button', { name: /Cambiar tema/ }).click();
  await page.getByRole('menuitem', { name: /Oscuro/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-dark');
}

test.describe('dashboard y reportes de administración', () => {
  test.use({ actor: 'ADMIN' });

  test.beforeEach(({ api }) => {
    api.on('GET /appointments', page(7));
    api.on('GET /patients', page(120));
    api.on('GET /doctors', page(8));
    api.on('GET /specialties', page(6));
    api.on('GET /reports/appointments-summary', summary);
    api.on('GET /reports/schedule-occupancy', occupancy);
    api.on('GET /reports/revenue', revenue);
    api.on('GET /reports/top-doctors', topDoctors);
  });

  test('el dashboard muestra las tarjetas del día y del mes y gráficos con nombre', async ({ page: p }) => {
    await p.goto('/dashboard', { timeout: 30_000 });

    const cards = p.getByRole('region', { name: 'Resumen de la sede' });
    await expect(cards.getByText('Citas de hoy')).toBeVisible();
    await expect(cards.getByText('7', { exact: true })).toBeVisible();
    await expect(cards.getByText('120', { exact: true })).toBeVisible();
    await expect(p.getByText('38 %')).toBeVisible();
    await expect(p.getByText('75 de 200 cupos')).toBeVisible();
    await expect(p.getByText(/S\/\s4,500\.00/)).toBeVisible();
    await expect(p.getByRole('img', { name: /Citas del mes por estado/ })).toBeVisible();
    await expect(p.getByRole('img', { name: /Citas por día del mes/ })).toBeVisible();
    await expect(p.getByRole('list', { name: 'Conteo por estado' }).getByRole('listitem').filter({ hasText: 'Inasistencia' })).toContainText('2');
    await expectAccessible(p);

    await darkMode(p);
    await expectAccessible(p);
  });

  test('los reportes muestran sus tarjetas y gráficos con nombre, en ambos modos', async ({ page: p }) => {
    await p.goto('/reports', { timeout: 30_000 });

    await expect(p.getByText(/S\/\s4,500\.00/)).toBeVisible();
    await expect(p.getByText('Lucía Paredes').first()).toBeVisible();
    for (const name of [/Citas por día/, /Ingresos del mes/, /Médicos con más citas completadas/, /Ocupación de cupos/, /Citas por estado/]) {
      await expect(p.getByRole('img', { name })).toBeVisible();
    }
    await expectAccessible(p);

    await darkMode(p);
    await expectAccessible(p);
  });
});
