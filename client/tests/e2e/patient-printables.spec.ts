import { expectAccessible } from '../support/accessible';
import { reply } from '../support/api';
import { expect, test } from '../support/fixtures';

const appointment = {
  id: 501,
  patientId: 100,
  scheduleId: 10,
  startTime: '09:00',
  endTime: '09:30',
  reason: null,
  notes: null,
  status: 'COMPLETED',
  paymentStatus: 'PAID',
  amount: 150,
  cancelReason: null,
  cancellationFee: null,
  isOverbook: false,
  pendingUntil: null,
  patient: { id: 100, name: 'Ana', lastName: 'Paciente', email: 'ana.paciente@test.local' },
  schedule: {
    id: 10,
    scheduleDate: '2026-10-12T00:00:00.000Z',
    timeFrom: '08:00',
    timeTo: '12:00',
    doctor: { id: 1, name: 'Lucía', lastName: 'Paredes' },
    specialty: { id: 2, name: 'Cardiología' },
  },
  timezone: 'America/Lima',
  hasPrescription: true,
  notesCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  clinic: { id: 1, name: 'Sede Miraflores', address: 'Av. Larco 1150, Miraflores', currency: 'PEN' },
};

const transaction = (id: number, amount: number, paidAt: string, gatewayId: string) => ({
  id,
  appointmentId: 501,
  amount,
  currency: 'PEN',
  status: 'PAID',
  paymentMethod: 'CREDIT_CARD',
  gatewayId,
  payerEmail: null,
  failureReason: null,
  paidAt,
  createdAt: paidAt,
});

const prescription = {
  id: 77,
  appointmentId: 501,
  instructions: 'Tomar con abundante agua.',
  validUntil: '2026-11-12T00:00:00.000Z',
  items: [
    { id: 1, medication: 'Amoxicilina 500 mg', dosage: '1 cápsula', frequency: 'Cada 8 horas', duration: '7 días', notes: null },
    { id: 2, medication: 'Paracetamol 500 mg', dosage: '1 tableta', frequency: 'Cada 6 horas si hay fiebre', duration: '3 días', notes: 'No exceder 4 g al día' },
  ],
  patient: { id: 100, name: 'Ana', lastName: 'Paciente' },
  doctor: { id: 1, name: 'Lucía', lastName: 'Paredes' },
  specialtyName: 'Cardiología',
  scheduleDate: '2026-10-12T00:00:00.000Z',
  appointmentStatus: 'COMPLETED',
  createdAt: '2026-10-12T15:00:00.000Z',
};

test.describe('comprobante y receta imprimibles', () => {
  test.use({ actor: 'PATIENT' });

  test.beforeEach(({ api }) => {
    api.on('GET /appointments/my/:id', appointment);
    api.on('GET /payments/appointment/:id/receipts', [
      transaction(31, 50, '2026-10-10T14:00:00.000Z', 'MP-111'),
      transaction(32, 100, '2026-10-12T13:30:00.000Z', 'MP-222'),
    ]);
    api.on('GET /prescriptions/my/appointment/:id', prescription);
  });

  test('el comprobante muestra la cita, cada pago aprobado y la leyenda', async ({ page }) => {
    await page.goto('/patient/appointments/501/comprobante');

    await expect(page.getByRole('heading', { level: 1, name: 'Comprobante de pago' })).toBeVisible();
    await expect(page.getByText('Sede Miraflores')).toBeVisible();
    await expect(page.getByText('Av. Larco 1150, Miraflores')).toBeVisible();
    await expect(page.getByText('Lucía Paredes')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'MP-111' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'MP-222' })).toBeVisible();
    await expect(page.getByText('S/ 150.00')).toBeVisible();
    await expect(page.getByText('Constancia de pago; no es un documento fiscal.')).toBeVisible();
    await expectAccessible(page);
  });

  test('sin pagos aprobados muestra un estado vacío', async ({ page, api }) => {
    api.on('GET /payments/appointment/:id/receipts', []);

    await page.goto('/patient/appointments/501/comprobante');

    await expect(page.getByText('Esta cita todavía no tiene pagos aprobados.')).toBeVisible();
  });

  test('una cita ajena o inexistente no muestra datos', async ({ page, api }) => {
    api.on('GET /appointments/my/:id', reply(404, { message: 'Cita no encontrada' }));

    await page.goto('/patient/appointments/999/comprobante');

    await expect(page.getByText('No encontramos esta cita.')).toBeVisible();
  });

  test('la receta muestra sus medicamentos e indicaciones', async ({ page }) => {
    await page.goto('/patient/appointments/501/receta');

    await expect(page.getByRole('heading', { level: 1, name: 'Receta médica' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Amoxicilina 500 mg' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Cada 6 horas si hay fiebre' })).toBeVisible();
    await expect(page.getByText('Tomar con abundante agua.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
    await expectAccessible(page);
  });

  test('Imprimir abre el diálogo de impresión y al imprimir solo queda el documento', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { printCalls: number }).printCalls = 0;
      window.print = () => {
        (window as unknown as { printCalls: number }).printCalls += 1;
      };
    });
    await page.goto('/patient/appointments/501/comprobante');
    await page.getByRole('button', { name: 'Imprimir' }).click();
    expect(await page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(1);

    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('heading', { level: 1, name: 'Comprobante de pago' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mis Citas' }).first()).toBeHidden();
    await expect(page.getByRole('button', { name: 'Imprimir' })).toBeHidden();
  });
});
