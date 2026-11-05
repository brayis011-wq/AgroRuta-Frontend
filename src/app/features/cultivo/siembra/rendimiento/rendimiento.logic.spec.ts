import { barrasSemanas, comparacion, partesCalidad } from './rendimiento.logic';
import { ResumenSiembra } from '../../../../core/models/cultivo.model';

const base: ResumenSiembra = {
  siembraId: 7, totalKg: 300, cosechas: 3, kgPrimera: 180, kgSegunda: 90, kgTercera: 30,
  kgPorPlanta: 0.25, kgPorHectarea: 166.7, areaHa: 1.8,
  semanas: [
    { semana: '2026-10-12', primera: 50, segunda: 20, tercera: 0 },
    { semana: '2026-10-19', primera: 0, segunda: 0, tercera: 0 },
    { semana: '2026-10-26', primera: 130, segunda: 70, tercera: 30 },
  ],
  carencia: null, reentrada: null,
  otrasTemporadas: [
    { siembraId: 5, cultivo: 'Uchuva · Kenya', fechaSiembra: '2025-04-10', fechaFin: '2026-01-20', enCurso: false, totalKg: 1640, kgPorPlanta: 1.64, mismoCultivo: true },
    { siembraId: 2, cultivo: 'Fríjol · Cargamanto', fechaSiembra: '2024-08-01', fechaFin: '2024-12-15', enCurso: false, totalKg: 410, kgPorPlanta: 0.5, mismoCultivo: false },
  ],
};

describe('rendimiento de la siembra', () => {
  it('escala las barras a la semana con más kilos', () => {
    const b = barrasSemanas(base.semanas);
    expect(b[2].total).toBe(230);
    expect(b[2].primera + b[2].segunda + b[2].tercera).toBeCloseTo(100);
    expect(b[0].primera).toBeCloseTo((50 / 230) * 100);
    expect(b[1].total).toBe(0);
  });

  it('sin cosechas no divide por cero', () => {
    expect(barrasSemanas([{ semana: '2026-10-12', primera: 0, segunda: 0, tercera: 0 }])[0].primera).toBe(0);
    expect(partesCalidad({ kgPrimera: 0, kgSegunda: 0, kgTercera: 0, totalKg: 0 }).primera).toBe(0);
  });

  it('calcula el porcentaje de cada calidad', () => {
    expect(partesCalidad(base)).toEqual({ primera: 60, segunda: 30, tercera: 10 });
  });

  it('compara solo con temporadas del mismo cultivo, por kg por planta', () => {
    const c = comparacion(base, { id: 7, nombre: 'Uchuva · Colombia', desde: '2026-03-02', plantas: 1200 });
    expect(c.porPlanta).toBe(true);
    expect(c.filas.map((f) => f.id)).toEqual([7, 5]);
    expect(c.filas[1].ancho).toBe(100);
    expect(c.filas[0].ancho).toBeCloseTo((0.25 / 1.64) * 100);
    expect(c.filas[0].actual).toBe(true);
  });

  it('si alguna temporada no tiene plantas compara por kilos', () => {
    const c = comparacion({ ...base, kgPorPlanta: null }, { id: 7, nombre: 'x', desde: '2026-03-02', plantas: 0 });
    expect(c.porPlanta).toBe(false);
    expect(c.filas[1].ancho).toBe(100);
  });
});
