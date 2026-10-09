import { expectAccessible } from '../support/accessible';
import { expect, test } from '../support/fixtures';

const payment = {
  id: 33,
  appointmentId: 501,
  amount: 150,
  currency: 'PEN',
  status: 'PAID',
  paymentMethod: 'CREDIT_CARD',
  gatewayId: 'MP-998877',
  payerEmail: null,
  failureReason: null,
  paidAt: '2026-10-09T15:00:00Z',
  createdAt: '2026-10-09T14:50:00Z',
};

test.describe('resultado del pago', () => {
  test.use({ actor: 'PATIENT' });

  test('el pago aprobado muestra el monto en la moneda de la sede', async ({ page, api }) => {
    api.on('GET /payments/appointment/:id', payment);

    await page.goto('/payment/success?external_reference=501');

    await expect(page.getByRole('heading', { level: 1, name: '¡Pago confirmado!' })).toBeVisible();
    await expect(page.getByText('S/ 150.00')).toBeVisible();
    await expect(page.getByText('Tarjeta de crédito')).toBeVisible();
    await expectAccessible(page);
  });

  test('el pago rechazado ofrece reintentar', async ({ page, api }) => {
    api.on('GET /payments/appointment/:id', { ...payment, status: 'FAILED', failureReason: 'Fondos insuficientes' });

    await page.goto('/payment/failure?external_reference=501');

    await expect(page.getByRole('button', { name: 'Reintentar pago' })).toBeVisible();
    await expect(page.getByText('Fondos insuficientes')).toBeVisible();
    await expectAccessible(page);
  });
});
