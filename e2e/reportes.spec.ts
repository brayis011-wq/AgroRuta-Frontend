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

test.describe('Reportes', () => {

  test('Descargar reporte de trabajadores', async ({ page }) => {
    await login(page);

    await page.goto('/reportes');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '⬇ Descargar PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('Descargar reporte de cultivos', async ({ page }) => {
    await login(page);

    await page.goto('/reportes');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Cultivos', exact: false }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '⬇ Descargar PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBeTruthy();
  });

});
