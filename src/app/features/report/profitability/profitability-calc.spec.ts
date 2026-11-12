import { FilaCostos } from '../costs/costs-calc';
import { anchoBarra, rentabilidadPorLote, resumenRentabilidad } from './profitability-calc';

const fila = (id: number, loteId: number | null, fecha: string, costo: number, ingresos: number, kg = 100, area: number | null = 2): FilaCostos => ({
  siembra: { siembraId: id, variedad: 'Café · Castillo', estado: 'FINALIZADO', fechaSiembra: fecha, diasDesdeSiembra: 1, totalKgCosechado: kg,
    totalCosechas: 1, cultivo: 'Café', loteNombre: 'Lote ' + (loteId ?? 'viejo'), fincaNombre: 'La Esperanza', loteId, loteAreaHa: area },
  costos: { siembraId: id, manoObra: costo, jornales: 1, insumos: 0, otros: 0, costoTotal: costo, ingresos, kgTotal: kg, kgConPrecio: ingresos ? kg : 0,
    precioPromedioKg: null, ganancia: ingresos ? ingresos - costo : null, costoPorKg: null, trabajadores: [], meses: [], fumigacionesSinCosto: 0, cosechasSinPrecio: 0 },
});

describe('rentabilidad por lote', () => {
  it('agrupa las temporadas por lote, la más reciente primero', () => {
    const lotes = rentabilidadPorLote([fila(1, 7, '2024-01-01', 1000, 1500), fila(2, 7, '2025-01-01', 1000, 3000), fila(3, 8, '2025-02-01', 500, 600)]);
    expect(lotes.length).toBe(2);
    expect(lotes[0].loteNombre).toBe('Lote 7');
    expect(lotes[0].temporadas.map((t) => t.siembraId)).toEqual([2, 1]);
    expect(lotes[0].ganancia).toBe(2500);
  });

  it('compara cada temporada con la anterior del mismo lote', () => {
    const [lote] = rentabilidadPorLote([fila(1, 7, '2024-01-01', 1000, 1500), fila(2, 7, '2025-01-01', 1000, 3000)]);
    const [reciente, antigua] = lote.temporadas;
    expect(antigua.cambio).toBeNull();
    expect(reciente.cambio).toBe(1500);
    expect(reciente.cambioPct).toBe(300);
    expect(lote.mejorId).toBe(2);
  });

  it('calcula margen, retorno y ganancia por hectárea', () => {
    const [lote] = rentabilidadPorLote([fila(1, 7, '2025-01-01', 1000, 4000, 200, 2)]);
    const t = lote.temporadas[0];
    expect(t.margen).toBe(75);
    expect(t.retorno).toBe(300);
    expect(t.gananciaPorHa).toBe(1500);
    expect(t.kgPorHa).toBe(100);
    expect(lote.mejorId).toBeNull();
  });

  it('sin precios de venta no inventa ganancia ni comparación', () => {
    const [lote] = rentabilidadPorLote([fila(1, 7, '2024-01-01', 1000, 0), fila(2, 7, '2025-01-01', 800, 0)]);
    expect(lote.ganancia).toBeNull();
    expect(lote.temporadas[0].cambio).toBeNull();
    expect(resumenRentabilidad([lote]).ganancia).toBeNull();
  });

  it('sin área no hay valores por hectárea', () => {
    const [lote] = rentabilidadPorLote([fila(1, 7, '2025-01-01', 1000, 4000, 200, null)]);
    expect(lote.temporadas[0].gananciaPorHa).toBeNull();
    expect(lote.gananciaPorHa).toBeNull();
  });

  it('las siembras antiguas sin loteId se agrupan por nombre', () => {
    const lotes = rentabilidadPorLote([fila(1, null, '2024-01-01', 100, 300), fila(2, null, '2025-01-01', 100, 200)]);
    expect(lotes.length).toBe(1);
    expect(lotes[0].temporadas.length).toBe(2);
  });

  it('ordena los lotes por ganancia y resume el mejor y el peor', () => {
    const lotes = rentabilidadPorLote([fila(1, 7, '2025-01-01', 1000, 900), fila(2, 8, '2025-01-01', 1000, 5000), fila(3, 9, '2025-01-01', 10, 0)]);
    const r = resumenRentabilidad(lotes);
    expect(lotes.map((l) => l.loteNombre)).toEqual(['Lote 8', 'Lote 7', 'Lote 9']);
    expect(r.mejorLote?.loteNombre).toBe('Lote 8');
    expect(r.peorLote?.loteNombre).toBe('Lote 7');
    expect(r.ganancia).toBe(3900);
  });

  it('la barra es proporcional a la mayor ganancia del lote', () => {
    const [lote] = rentabilidadPorLote([fila(1, 7, '2024-01-01', 1000, 2000), fila(2, 7, '2025-01-01', 1000, 3000)]);
    expect(anchoBarra(lote.temporadas[0], lote)).toBe(100);
    expect(anchoBarra(lote.temporadas[1], lote)).toBe(50);
  });
});
