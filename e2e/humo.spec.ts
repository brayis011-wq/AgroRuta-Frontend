import { test, expect, type Page } from '@playwright/test';

/**
 * Prueba de humo sin backend: la API se simula con page.route, así que corre en GitHub Actions
 * solo con `ng serve`. Comprueba que la app arranca, enruta y muestra los errores del servidor.
 * Las demás pruebas de e2e/ necesitan el backend y una cuenta real (se corren a mano).
 */

async function sinSesion(page: Page): Promise<void> {
  // Al abrir, la app intenta renovar la sesión con la cookie: sin cookie, 401
  await page.route('**/api/auth/refresh', (r) =>
    r.fulfill({ status: 401, json: { message: 'Sin sesión', errorCode: 'AGR-001' } }),
  );
}

test.describe('Humo (API simulada)', () => {
  test('la raíz lleva al ingreso con su formulario', async ({ page }) => {
    await sinSesion(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('una contraseña equivocada muestra el aviso de error', async ({ page }) => {
    await sinSesion(page);
    await page.route('**/api/auth/login', (r) =>
      r.fulfill({
        status: 401,
        json: { message: 'Correo o contraseña incorrectos.', errorCode: 'AGR-002' },
      }),
    );
    await page.goto('/auth/login');

    await page.locator('input[type="email"]').fill('nadie@agroruta.test');
    await page.locator('input[type="password"]').fill('clave-equivocada');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('la política de privacidad se abre sin sesión', async ({ page }) => {
    await sinSesion(page);
    await page.goto('/privacy');

    await expect(page.locator('h1')).toBeVisible();
  });
});
