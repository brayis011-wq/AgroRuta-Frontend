import { calcularResumen, diasDesde, fechaLocal, inicioMesAnterior, pasoEtapa, saludoSegunHora, serieJornales } from './resumen-inicio';

const HOY = new Date(2026, 10, 4, 15, 0); // 4 nov 2026, 3 p. m.
const base = { nominas: [], pagos: [], trabajadores: [], jornales: [], lotes: [] } as any;

describe('resumen del Inicio', () => {
  it('reads "YYYY-MM-DD" as a local date (no day shift in UTC-5)', () => {
    expect(fechaLocal('2026-11-01')!.getDate()).toBe(1);
  });

  it('greeting depends on the hour', () => {
    expect(saludoSegunHora(new Date(2026, 0, 1, 8))).toBe('morning');
    expect(saludoSegunHora(HOY)).toBe('afternoon');
    expect(saludoSegunHora(new Date(2026, 0, 1, 21))).toBe('evening');
  });

  it('previous month start crosses the year', () => {
    expect(inicioMesAnterior(new Date(2026, 0, 15))).toEqual(new Date(2025, 11, 1));
  });

  it('counts payrolls to approve and to pay with their totals', () => {
    const r = calcularResumen({ ...base, nominas: [
      { estado: 'PENDIENTE', valorTotal: 100 }, { estado: 'PENDIENTE', valorTotal: 50 },
      { estado: 'APROBADA', valorTotal: 70 }, { estado: 'PAGADA', valorTotal: 999 },
    ] }, HOY);
    expect(r.porAprobar).toEqual({ n: 2, total: 150 });
    expect(r.sinPagar).toEqual({ n: 1, total: 70 });
    expect(r.pendientes).toBe(3);
  });

  it('active workers without a work day today', () => {
    const r = calcularResumen({ ...base,
      trabajadores: [{ id: 1, estado: 'ACTIVO' }, { id: 2, estado: 'ACTIVO' }, { id: 3, estado: 'INACTIVO' }],
      jornales: [{ fecha: '2026-11-04', trabajador: { id: 1 } }, { fecha: '2026-11-03', trabajador: { id: 2 } }],
    }, HOY);
    expect(r.trabajadoresActivos).toBe(2);
    expect(r.sinJornalHoy).toBe(1);
  });

  it('month trends compare with the previous month', () => {
    const r = calcularResumen({ ...base,
      jornales: [{ fecha: '2026-11-02' }, { fecha: '2026-11-03' }, { fecha: '2026-11-04' }, { fecha: '2026-10-10' }, { fecha: '2026-10-11' }],
      pagos: [{ monto: 300, fechaPago: '2026-11-01' }, { monto: 200, fecha: '2026-10-20' }],
    }, HOY);
    expect(r.jornalesMes).toEqual({ actual: 3, anterior: 2, porcentaje: 50 });
    expect(r.pagadoMes).toEqual({ actual: 300, anterior: 200, porcentaje: 50 });
  });

  it('no percentage when last month was zero', () => {
    const r = calcularResumen({ ...base, jornales: [{ fecha: '2026-11-02' }] }, HOY);
    expect(r.jornalesMes.porcentaje).toBeNull();
  });

  it('plots: free, in production and portal requests', () => {
    const r = calcularResumen({ ...base,
      lotes: [{ estado: 'DISPONIBLE' }, { estado: 'EN_CULTIVO' }, { estado: 'EN_CULTIVO' }, { estado: 'EN_DESCANSO' }],
      trabajadores: [{ id: 1, estado: 'ACTIVO', accesoEstado: 'PENDIENTE' }],
    }, HOY);
    expect([r.lotesDisponibles, r.lotesEnCultivo, r.lotesTotal, r.solicitudesPortal]).toEqual([1, 2, 4, 1]);
  });

  it('serieJornales counts work days and pay per day, ending today', () => {
    const hoy = new Date(2026, 10, 4, 18);
    const s = serieJornales([
      { fecha: '2026-11-04', valorJornal: 60000 }, { fecha: '2026-11-04', valorJornal: 70000 },
      { fecha: '2026-11-01', valorJornal: 60000 }, { fecha: '2026-09-01', valorJornal: 60000 },
    ] as never, hoy, 7);
    expect(s.length).toBe(7);
    expect(s[6]).toMatchObject({ n: 2, valor: 130000, hoy: true });
    expect(s[3].n).toBe(1);
    expect(s.reduce((a, d) => a + d.n, 0)).toBe(3);
  });

  it('pasoEtapa and diasDesde', () => {
    expect(pasoEtapa('GERMINACION')).toBe(1);
    expect(pasoEtapa('COSECHA')).toBe(4);
    expect(pasoEtapa('FINALIZADO')).toBe(0);
    expect(diasDesde('2026-11-01', new Date(2026, 10, 4, 22))).toBe(3);
  });
});
