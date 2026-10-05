import { expect, test } from './fixtures';
import { API_URL } from './api';

test.describe('arnés de pruebas de navegador', () => {
  test.use({ actor: 'PATIENT' });

  test('un actor sembrado entra a su inicio sin pasar por el login', async ({ page }) => {
    await page.goto('/patient');

    await expect(page).toHaveURL(/\/patient$/);
  });

  test('una llamada REST sin fixture queda registrada con método y ruta', async ({ page, api }) => {
    await page.goto('/patient');
    await page.evaluate(async (url) => {
      await fetch(`${url}/ruta-sin-fixture`).catch(() => undefined);
    }, API_URL);

    expect(api.unmatched).toContain('REST sin fixture: GET /ruta-sin-fixture');
    api.unmatched.length = 0;
  });

  test('un fixture del test reemplaza la respuesta por defecto', async ({ page, api }) => {
    api.on('GET /notifications/unread-count', { count: 3 });

    await page.goto('/patient');

    await expect(page.locator('#notification-bell-btn .MuiBadge-badge')).toHaveText('3');
  });

  test('GraphQL se enruta por el campo raíz de la consulta', async ({ page, api }) => {
    api.on('GQL myPatientRecord', { data: { myPatientRecord: { id: 7 } } });

    await page.goto('/patient');
    const responses = await page.evaluate(async (url) => {
      const post = (query: string) =>
        fetch(`${url}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
          .then((res) => res.json())
          .catch(() => null);
      return [await post('{ myPatientRecord { id } }'), await post('query { patientRecord(id: 1) { id } }')];
    }, API_URL);

    expect(responses[0]).toEqual({ data: { myPatientRecord: { id: 7 } } });
    expect(api.unmatched).toContain('GraphQL sin fixture: patientRecord');
    api.unmatched.length = 0;
  });
});
