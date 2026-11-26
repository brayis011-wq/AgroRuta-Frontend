import { SIN_COPIA, SIN_COPIA_EN_MEMORIA, sinCopia } from './rutas-sin-copia';

describe('rutas sin copia', () => {
  it('never copies session, security, admin, backups, public checks or push', () => {
    for (const ruta of [
      '/api/auth/me',
      '/api/admin/users',
      '/api/backups',
      '/api/configuration/security/sessions',
      '/api/public/verify/1',
      '/api/push/subscriptions',
    ]) {
      expect(sinCopia(ruta, SIN_COPIA)).toBe(true);
      expect(sinCopia(ruta, SIN_COPIA_EN_MEMORIA)).toBe(true);
    }
  });

  it('keeps preferences for offline use but not in the 10 s memory cache', () => {
    expect(sinCopia('/api/configuration', SIN_COPIA)).toBe(false);
    expect(sinCopia('/api/configuration', SIN_COPIA_EN_MEMORIA)).toBe(true);
  });

  it('copies the farm data', () => {
    for (const ruta of [
      '/api/workers',
      '/api/workdays/home-summary',
      '/api/reports/crops/preview',
    ]) {
      expect(sinCopia(ruta, SIN_COPIA)).toBe(false);
      expect(sinCopia(ruta, SIN_COPIA_EN_MEMORIA)).toBe(false);
    }
  });

  it('the memory list includes every route of the shared list', () => {
    expect(SIN_COPIA.every((r) => SIN_COPIA_EN_MEMORIA.includes(r))).toBe(true);
  });
});
