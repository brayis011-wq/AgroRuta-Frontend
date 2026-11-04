import { barrasMensuales, cultivoDe, filtrarSiembras, mesCorto, ordenarTrabajadores, participacion, resumenCultivos, resumenNomina, ubicacionDe, variacionUltimoMes } from './report-calc';

const w = (id: number, n: string, paid: number, jornales = 10): any => ({ workerId: id, workerName: n, totalPaid: paid, totalPagos: 1, totalJornales: jornales });
const c = (o: any): any => ({ siembraId: 1, variedad: 'Uchuva · Colombia', estado: 'PRODUCCION', totalKgCosechado: 0, totalCosechas: 0, ...o });

describe('report-calc', () => {
  it('mesCorto in both languages and with year when it changes', () => {
    expect(mesCorto('2026-11', 'es')).toBe('nov');
    expect(mesCorto('2026-11', 'en')).toBe('Nov');
    expect(mesCorto('2027-01', 'es', true)).toBe('ene 27');
  });

  it('monthly bars scale to the highest month and mark the last one', () => {
    const b = barrasMensuales([{ mes: '2026-10', total: 50, pagos: 1 }, { mes: '2026-11', total: 100, pagos: 2 }], 'es');
    expect(b.map((x) => x.altura)).toEqual([50, 100]);
    expect(b[1].actual).toBe(true);
    expect(barrasMensuales([{ mes: '2026-12', total: 1, pagos: 1 }, { mes: '2027-01', total: 1, pagos: 1 }], 'es')[1].etiqueta).toBe('ene 27');
  });

  it('variation of the last month; null when previous is zero', () => {
    expect(variacionUltimoMes([{ mes: 'a', total: 100, pagos: 1 }, { mes: 'b', total: 150, pagos: 1 }])).toBe(50);
    expect(variacionUltimoMes([{ mes: 'a', total: 0, pagos: 0 }, { mes: 'b', total: 150, pagos: 1 }])).toBeNull();
    expect(variacionUltimoMes([])).toBeNull();
  });

  it('participacion gives % of total and width relative to the max', () => {
    const p = participacion([3, 1], (x) => String(x), (x) => x);
    expect(p.map((x) => x.porcentaje)).toEqual([75, 25]);
    expect(p[0].ancho).toBe(100);
    expect(p[1].ancho).toBeCloseTo(33.33, 1);
  });

  it('payroll summary: averages and pending', () => {
    const s = resumenNomina({ generatedAt: '', totalAccumulated: 1000, workerDetails: [w(1, 'A', 600, 6), w(2, 'B', 400, 4)], totalPendiente: 300, nominasPendientes: 2 });
    expect(s).toMatchObject({ trabajadores: 2, promedio: 500, jornales: 10, valorJornalPromedio: 100, pendiente: 300, nominasPendientes: 2 });
  });

  it('sorts and filters workers ignoring accents', () => {
    const ws = [w(1, 'Ana', 100, 9), w(2, 'Íñigo', 300, 1)];
    expect(ordenarTrabajadores(ws, 'total', '').map((x) => x.workerName)).toEqual(['Íñigo', 'Ana']);
    expect(ordenarTrabajadores(ws, 'jornales', '').map((x) => x.workerName)).toEqual(['Ana', 'Íñigo']);
    expect(ordenarTrabajadores(ws, 'nombre', 'inigo').map((x) => x.workerId)).toEqual([2]);
  });

  it('crop helpers: crop name, place, summary and filters', () => {
    expect(cultivoDe(c({ cultivo: null, variedad: 'Café · Castillo' }))).toBe('Café');
    expect(ubicacionDe(c({ fincaNombre: 'La Esperanza', loteNombre: 'Lote 1' }))).toBe('La Esperanza · Lote 1');
    expect(ubicacionDe(c({}))).toBe('—');
    const cs = [c({ cultivo: 'Uchuva', totalKgCosechado: 30, totalCosechas: 3 }), c({ cultivo: 'Café', variedad: 'Café · Castillo', estado: 'FINALIZADO', totalKgCosechado: 10, totalCosechas: 1, fincaNombre: 'El Recuerdo' })];
    const s = resumenCultivos({ generatedAt: '', cropDetails: cs });
    expect(s).toMatchObject({ siembras: 2, activas: 1, finalizadas: 1, kg: 40, cosechas: 4, kgPorCosecha: 10, tipos: 2 });
    expect(s.kgPorCultivo[0]).toMatchObject({ nombre: 'Uchuva', porcentaje: 75 });
    expect(s.porEtapa.find((p) => p.etapa === 'FINALIZADO')!.n).toBe(1);
    expect(filtrarSiembras(cs, 'FINALIZADO', '').length).toBe(1);
    expect(filtrarSiembras(cs, null, 'recuerdo').length).toBe(1);
  });
});
