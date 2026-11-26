import {
  MES_LUNAR,
  TOTAL_DICHOS,
  almanaqueDe,
  caminoLuna,
  diaDelAnio,
  edadLuna,
  faseLuna,
  iluminacion,
} from './almanac';

/** Mediodía en Colombia (UTC-5) de una fecha */
const dia = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d, 17));

describe('almanaque', () => {
  it('reconoce las fases de noviembre de 2026 (nueva el 9, llena el 24)', () => {
    expect(faseLuna(dia(2026, 11, 9))).toBe('nueva');
    expect(faseLuna(dia(2026, 11, 16))).toBe('creciente');
    expect(faseLuna(dia(2026, 11, 24))).toBe('llena');
    expect(faseLuna(dia(2026, 12, 2))).toBe('menguante');
  });

  it('reconoce fases de otros años', () => {
    // Luna llena del 13 de marzo de 2025 y nueva del 29 de marzo de 2025
    expect(faseLuna(dia(2025, 3, 14))).toBe('llena');
    expect(faseLuna(dia(2025, 3, 29))).toBe('nueva');
  });

  it('la edad de la luna siempre está dentro del mes lunar, también antes del año 2000', () => {
    for (const f of [dia(1995, 6, 1), dia(2000, 1, 6), dia(2026, 11, 16), dia(2040, 2, 29)]) {
      const edad = edadLuna(f);
      expect(edad).toBeGreaterThanOrEqual(0);
      expect(edad).toBeLessThan(MES_LUNAR);
    }
  });

  it('la luna llena está casi toda iluminada y la nueva casi nada', () => {
    expect(iluminacion(dia(2026, 11, 24))).toBeGreaterThan(0.95);
    expect(iluminacion(dia(2026, 11, 9))).toBeLessThan(0.05);
  });

  it('dibuja la luz a la derecha en creciente y a la izquierda en menguante', () => {
    // El primer arco recorre medio disco: sentido 1 = por la derecha, 0 = por la izquierda
    expect(caminoLuna(dia(2026, 11, 16))).toMatch(/^M0 -10A10 10 0 0 1 0 10A/);
    expect(caminoLuna(dia(2026, 12, 2))).toMatch(/^M0 -10A10 10 0 0 0 0 10A/);
  });

  it('cuenta el día del año', () => {
    expect(diaDelAnio(new Date(2026, 0, 1))).toBe(1);
    expect(diaDelAnio(new Date(2026, 11, 31))).toBe(365);
    expect(diaDelAnio(new Date(2028, 11, 31))).toBe(366);
  });

  it('el dicho cambia cada día y siempre existe', () => {
    const uno = almanaqueDe(new Date(2026, 10, 16, 8));
    const mismoDia = almanaqueDe(new Date(2026, 10, 16, 21));
    const siguiente = almanaqueDe(new Date(2026, 10, 17, 8));
    expect(mismoDia.dicho).toBe(uno.dicho);
    expect(siguiente.dicho).not.toBe(uno.dicho);
    for (let d = 0; d < 400; d++) {
      const n = almanaqueDe(new Date(2026, 0, 1 + d)).dicho;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(TOTAL_DICHOS);
    }
  });
});
