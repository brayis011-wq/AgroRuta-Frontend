import { diasDelMes, diasHasta, ordenAgenda, esPorVenir } from './events';
import { EventoCalendario } from '../../../core/models/crop.model';

const ev = (fecha: string, estado: EventoCalendario['estado'], tipo: EventoCalendario['tipo'] = 'ACTIVIDAD'): EventoCalendario => ({
  fecha, estado, tipo, titulo: null, detalle: null, siembraId: 1, loteId: 1, loteNombre: 'L', cultivo: 'C', refId: null,
});

describe('eventos del calendario', () => {
  it('la cuadrícula de noviembre 2026 va de lunes 26 oct a domingo 6 dic', () => {
    const d = diasDelMes(2026, 10);
    expect(d[0]).toEqual({ fecha: '2026-10-26', delMes: false });
    expect(d[d.length - 1]).toEqual({ fecha: '2026-12-06', delMes: false });
    expect(d.length % 7).toBe(0);
    expect(d.filter((x) => x.delMes).length).toBe(30);
  });

  it('un mes que empieza en lunes no agrega días antes', () => {
    expect(diasDelMes(2026, 5)[0].fecha).toBe('2026-06-01');
  });

  it('cuenta los días hasta una fecha', () => {
    expect(diasHasta('2026-11-06', '2026-11-04')).toBe(2);
    expect(diasHasta('2026-11-01', '2026-11-04')).toBe(-3);
  });

  it('en la agenda lo atrasado va primero y luego por fecha', () => {
    const lista = [ev('2026-11-08', 'PENDIENTE'), ev('2026-11-04', 'ATRASADO', 'FUMIGACION_SUGERIDA'), ev('2026-11-05', 'ESTIMADO')];
    expect(lista.sort(ordenAgenda).map((e) => e.estado)).toEqual(['ATRASADO', 'ESTIMADO', 'PENDIENTE']);
    expect(esPorVenir(ev('2026-11-01', 'HECHO'))).toBe(false);
  });
});
