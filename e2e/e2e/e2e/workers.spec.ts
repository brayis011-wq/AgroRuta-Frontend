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

async function irAWorkerYEsperar(page: any) {
  await page.goto('/worker');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('Workers - Flujo completo', () => {

  test('Crear nuevo trabajador', async ({ page }) => {
    await login(page);
    await irAWorkerYEsperar(page);

    await page.getByRole('button', { name: 'Nuevo Trabajador' }).click();
    await page.getByRole('textbox', { name: 'Ej: Carlos' }).fill('Pedro');
    await page.getByRole('textbox', { name: 'Ej: Pérez' }).fill('Neto');
    await page.getByRole('textbox', { name: 'Número de documento' }).fill('1069713648');
    await page.getByRole('textbox', { name: 'Opcional' }).first().fill('3213471968');
    await page.getByRole('textbox', { name: 'Opcional' }).nth(1).fill('Fusagasugá, Cundinamarca');
    await page.locator('input[type="date"]').fill('2026-05-28');
    await page.getByRole('combobox').nth(1).selectOption('3: 6');
    await page.getByRole('button', { name: 'Registrar trabajador' }).click();

    await expect(page.getByText('Pedro Neto', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Registrar jornal a trabajador', async ({ page }) => {
    await login(page);
    await irAWorkerYEsperar(page);

    // Usa "Seraldine" porque el test de edición ya cambió el nombre
    await page.getByText('Seraldine', { exact: false }).first().click();
    await page.getByRole('button', { name: '🗓️ Registrar Jornal' }).click();

    await page.locator('input[type="date"]').fill('2026-05-26');
    await page.getByPlaceholder('ID del cultivo').fill('1');
    await page.getByRole('textbox', { name: 'Ej: Café Arábiga Lote' }).fill('uchuva');
    await page.getByRole('textbox', { name: 'Notas adicionales (opcional)' }).fill('cumple en sus horas');
    await page.getByText('○').click();
    await page.getByRole('button', { name: 'Registrar Jornal' }).click();

    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Seraldine', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Ver nóminas y detalle de pago', async ({ page }) => {
    await login(page);
    await irAWorkerYEsperar(page);

    await page.getByRole('button', { name: '📋 Nóminas' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByText('Seraldine', { exact: false }).first().click();
    await page.getByRole('link', { name: '💰' }).first().click();

    await expect(page.getByText('💵').first()).toBeVisible({ timeout: 10000 });
  });

  test('Generar y aprobar nómina', async ({ page }) => {
    await login(page);
    await irAWorkerYEsperar(page);

    await page.locator('.trabajador-avatar', { hasText: 'Ss' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: '📅 Ver Jornales' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: '📋 Generar Nómina' }).first().click();
    await page.getByRole('button', { name: '📋 Generar Nómina', exact: true }).click();
    await page.getByRole('button', { name: 'Ver nóminas del trabajador →' }).click();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '✔' }).click();

    await expect(page.getByText('Seraldine', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Editar datos de trabajador', async ({ page }) => {
    await login(page);
    await irAWorkerYEsperar(page);

    await page.getByText('carlos sanchez', { exact: false }).first().click();
    await page.getByRole('button', { name: '✏️ Editar datos' }).click();

    await page.getByRole('textbox').nth(1).fill('Carlos');
    await page.getByRole('textbox').nth(2).fill('Sanchez');
    await page.getByRole('combobox').selectOption('TEMPORAL');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Carlos', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

});
