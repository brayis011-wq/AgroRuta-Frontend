import { ordenarCostos, totalesCostos, FilaCostos } from './costs-calc';

const fila = (id: number, fecha: string, costo: number, ingresos: number, kgConPrecio: number, kg: number, cultivo = 'Uchuva'): FilaCostos => ({
  siembra: { siembraId: id, variedad: 'X', estado: 'PRODUCCION', fechaSiembra: fecha, diasDesdeSiembra: 1, totalKgCosechado: kg, totalCosechas: 1, cultivo, loteNombre: 'Lote ' + id, fincaNombre: 'F' },
  costos: { siembraId: id, manoObra: costo, jornales: 1, insumos: 0, otros: 0, costoTotal: costo, ingresos, kgTotal: kg, kgConPrecio,
    precioPromedioKg: null, ganancia: kgConPrecio ? ingresos - costo : null, costoPorKg: null, trabajadores: [], meses: [], fumigacionesSinCosto: 0, cosechasSinPrecio: 0 },
});

describe('costos en reportes', () => {
  it('suma las temporadas y calcula el costo por kilo', () => {
    const t = totalesCostos([fila(1, '2026-01-01', 1000, 3000, 10, 10), fila(2, '2025-01-01', 500, 0, 0, 5)]);
    expect(t.costo).toBe(1500);
    expect(t.ingresos).toBe(3000);
    expect(t.ganancia).toBe(1500);
    expect(t.costoPorKg).toBe(100);
    expect(t.conDatos).toBe(2);
  });

  it('sin ningún precio de venta no hay ganancia', () => {
    expect(totalesCostos([fila(1, '2026-01-01', 1000, 0, 0, 10)]).ganancia).toBeNull();
  });

  it('ordena por ganancia dejando al final las que no tienen precio', () => {
    const f = [fila(1, '2026-01-01', 1000, 1500, 1, 1), fila(2, '2025-01-01', 100, 0, 0, 1), fila(3, '2024-01-01', 100, 2000, 1, 1)];
    expect(ordenarCostos(f, 'ganancia', '').map((x) => x.siembra.siembraId)).toEqual([3, 1, 2]);
    expect(ordenarCostos(f, 'reciente', '').map((x) => x.siembra.siembraId)).toEqual([1, 2, 3]);
  });

  it('filtra por cultivo o lote', () => {
    const f = [fila(1, '2026-01-01', 1, 0, 0, 0, 'Café'), fila(2, '2025-01-01', 1, 0, 0, 0, 'Uchuva')];
    expect(ordenarCostos(f, 'reciente', 'café').map((x) => x.siembra.siembraId)).toEqual([1]);
    expect(ordenarCostos(f, 'reciente', 'lote 2').map((x) => x.siembra.siembraId)).toEqual([2]);
  });
});
