import { test, expect } from '@playwright/test';

const EMAIL = 'brayan@agroruta.com';
const PASSWORD = '12345678';

async function login(page: any) {
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(EMAIL);
  await page.getByRole('textbox', { name: '••••••••' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('link', { name: '🌱 Cultivos' })).toBeVisible();
}

test.describe('Configuración', () => {

  test('Cambiar contraseña', async ({ page }) => {
    await login(page);

    await page.goto('/configuracion');
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: 'Contraseña actual *' }).fill('12345678');
    await page.getByRole('textbox', { name: 'Nueva contraseña *', exact: true }).fill('12345678');
    await page.getByRole('textbox', { name: 'Confirmar nueva contraseña *' }).fill('12345678');
    await page.getByRole('button', { name: '🔒 Cambiar contraseña' }).click();

    await expect(page.getByRole('button', { name: '🔒 Cambiar contraseña' })).toBeVisible({ timeout: 10000 });
  });

});
