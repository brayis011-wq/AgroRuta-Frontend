import { describe, expect, it } from 'vitest';
import { tablaCostos, tablaCultivos, tablaNomina, tablaRentabilidad } from './report-csv';
import { CropDetail } from '../../core/services/report.service';
import { RentabilidadLote } from './profitability/profitability-calc';

const t = (clave: string) => clave.split('.').pop()!;

const siembra: CropDetail = {
  siembraId: 34, variedad: 'Castillo', estado: 'COSECHA', fechaSiembra: '2025-09-22', diasDesdeSiembra: 422,
  totalKgCosechado: 380, totalCosechas: 1, cultivo: 'Café', loteNombre: 'Lote Cafetal', fincaNombre: 'El Mirador', fechaFin: null,
};

describe('tablas de los reportes para CSV', () => {
  it('nómina: una fila por trabajador con fechas AAAA-MM-DD', () => {
    const tabla = tablaNomina([{ workerId: 1, workerName: 'Luis Rojas', totalPagos: 2, totalPaid: 390000,
      periodoInicio: '2026-11-06T00:00:00', periodoFin: '2026-11-15', totalJornales: 6 }], t);
    expect(tabla.encabezados).toEqual(['worker', 'from', 'to', 'workdays', 'payments', 'totalPaid']);
    expect(tabla.filas).toEqual([['Luis Rojas', '2026-11-06', '2026-11-15', 6, 2, 390000]]);
  });

  it('la variedad no repite el cultivo cuando el servidor la manda como "Café · Castillo"', () => {
    expect(tablaCultivos([{ ...siembra, variedad: 'Café · Castillo' }], t).filas[0][1]).toBe('Castillo');
    expect(tablaCostos([{ siembra: { ...siembra, variedad: 'Café · Castillo' }, costos: null }], t).filas[0][1]).toBe('Castillo');
  });

  it('cultivos: la etapa traducida y sin fecha de fin si sigue en curso', () => {
    expect(tablaCultivos([siembra], t).filas[0]).toEqual(
      ['Café', 'Castillo', 'El Mirador', 'Lote Cafetal', 'COSECHA', '2025-09-22', '', 422, 1, 380]);
  });

  it('costos: sin costos cargados las cifras quedan vacías', () => {
    const fila = tablaCostos([{ siembra, costos: null }], t).filas[0];
    expect(fila.slice(0, 6)).toEqual(['Café', 'Castillo', 'El Mirador', 'Lote Cafetal', '2025-09-22', '']);
    expect(fila.slice(6).every((v) => v === undefined)).toBe(true);
  });

  it('rentabilidad: una fila por temporada de cada lote', () => {
    const lote = {
      clave: '9', loteNombre: 'Lote 1', fincaNombre: 'La Esperanza', areaHa: 2, costo: 0, ingresos: 0, ganancia: null,
      margen: null, gananciaPorHa: null, mejorId: null,
      temporadas: [
        { siembraId: 1, nombre: 'Café 2025', fechaSiembra: '2025-01-01', fechaFin: '2025-12-01', costo: 100, ingresos: 300, kg: 50, ganancia: 200, margen: 66.7 },
        { siembraId: 2, nombre: 'Café 2026', fechaSiembra: '2026-01-01', fechaFin: null, costo: 80, ingresos: 0, kg: 0, ganancia: null, margen: null },
      ],
    } as unknown as RentabilidadLote;
    const tabla = tablaRentabilidad([lote], t);
    expect(tabla.filas).toHaveLength(2);
    expect(tabla.filas[0]).toEqual(['La Esperanza', 'Lote 1', 2, 'Café 2025', '2025-01-01', '2025-12-01', 100, 300, 50, 200, 66.7]);
  });
});
