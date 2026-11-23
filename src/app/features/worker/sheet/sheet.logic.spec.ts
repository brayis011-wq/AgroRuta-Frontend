import { CasillaPlanilla, FilaPlanilla } from '../../../core/services/worker.service';
import { diasDeSemana, indexar, clave, lunesDe, porQuitar, sumarDias, totalDia, totalFila } from './sheet.logic';
import { semanaActual, semanaAnterior, semanaParaPagar } from '../roster/list-roster/semana';
import { consejoLluvia } from '../../weather/rain-card/rain-card';

const casilla = (id: number, trabajadorId: number, fecha: string, extra: Partial<CasillaPlanilla> = {}): CasillaPlanilla => ({
  id, trabajadorId, fecha, cultivoId: 5, nombreCultivo: 'Lote 1', valor: 60000, kilos: null, liquidado: false, enNomina: false, nominaEstado: null, ...extra,
});

const fila = (id: number): FilaPlanilla => ({
  id, nombreCompleto: 'Ana Ruiz', iniciales: 'AR', activo: true, cargo: 'Recolector', modalidadPago: 'JORNAL', valorJornal: 60000, valorKilo: null,
});

describe('Planilla semanal', () => {
  it('la semana empieza el lunes, también si hoy es domingo', () => {
    expect(diasDeSemana(lunesDe(new Date(2026, 10, 22)))).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
    expect(lunesDe(new Date(2026, 10, 16)).getDate()).toBe(16);
  });

  it('sumar días cruza el mes', () => {
    expect(sumarDias('2026-11-30', 7)).toBe('2026-12-07');
    expect(sumarDias('2026-12-07', -7)).toBe('2026-11-30');
  });

  it('agrupa los jornales por trabajador y día', () => {
    const m = indexar([casilla(1, 7, '2026-11-16'), casilla(2, 7, '2026-11-16', { cultivoId: 9 }), casilla(3, 8, '2026-11-17')]);
    expect(m.get(clave(7, '2026-11-16'))?.length).toBe(2);
    expect(m.get(clave(8, '2026-11-17'))?.length).toBe(1);
    expect(m.get(clave(8, '2026-11-16'))).toBeUndefined();
  });

  it('suma lo de cada trabajador y cuenta quién trabajó cada día', () => {
    const js = [casilla(1, 7, '2026-11-16', { valor: 45000, kilos: 50 }), casilla(2, 7, '2026-11-17', { valor: 36000, kilos: 40 }), casilla(3, 8, '2026-11-16')];
    expect(totalFila(fila(7), js)).toEqual({ jornales: 2, kilos: 90, valor: 81000 });
    expect(totalDia('2026-11-16', js)).toBe(2);
  });

  it('al tocar una casilla se quita el jornal del cultivo elegido y nunca uno que ya está en nómina', () => {
    const enNomina = casilla(1, 7, '2026-11-16', { enNomina: true, nominaEstado: 'APROBADA' });
    expect(porQuitar([enNomina], 5)).toBeNull();
    // En una nómina pendiente sí se puede quitar: la nómina se recalcula
    expect(porQuitar([casilla(9, 7, '2026-11-16', { enNomina: true, nominaEstado: 'PENDIENTE' })], 5)?.id).toBe(9);
    const otro = casilla(2, 7, '2026-11-16', { cultivoId: 9 });
    const elegido = casilla(3, 7, '2026-11-16', { cultivoId: 5 });
    expect(porQuitar([enNomina, otro, elegido], 5)?.id).toBe(3);
    expect(porQuitar([enNomina, otro], 5)?.id).toBe(2);
  });
});

describe('Semanas de nómina', () => {
  it('la semana va de lunes a domingo, también si el día es domingo', () => {
    expect(semanaActual(new Date(2026, 10, 22))).toEqual({ inicio: '2026-11-16', fin: '2026-11-22' });
    expect(semanaActual(new Date(2026, 10, 16))).toEqual({ inicio: '2026-11-16', fin: '2026-11-22' });
    expect(semanaAnterior(new Date(2026, 10, 18))).toEqual({ inicio: '2026-11-09', fin: '2026-11-15' });
  });

  it('cruza el mes y el año', () => {
    expect(semanaActual(new Date(2026, 11, 31))).toEqual({ inicio: '2026-12-28', fin: '2027-01-03' });
  });

  it('el fin de semana se paga la semana que termina; entre semana, la anterior', () => {
    expect(semanaParaPagar(new Date(2026, 10, 21))).toEqual({ inicio: '2026-11-16', fin: '2026-11-22' }); // sábado
    expect(semanaParaPagar(new Date(2026, 10, 18))).toEqual({ inicio: '2026-11-09', fin: '2026-11-15' }); // miércoles
  });
});

describe('Consejo de la lluvia', () => {
  const r = (dias: { fecha: string; milimetros: number }[], diasSinLluvia: number | null) =>
    ({ ultimos7: 0, ultimos30: 0, ultimaLluvia: null, diasSinLluvia, dias });

  it('con 15 mm o más en tres días no hace falta regar', () => {
    expect(consejoLluvia(r([{ fecha: '2026-11-20', milimetros: 10 }, { fecha: '2026-11-21', milimetros: 6 }], 0), '2026-11-21')).toBe('noRegar');
    expect(consejoLluvia(r([{ fecha: '2026-11-17', milimetros: 30 }], 4), '2026-11-21')).toBeNull();
  });

  it('una semana sin lluvia sugiere revisar el riego', () => {
    expect(consejoLluvia(r([{ fecha: '2026-11-10', milimetros: 4 }], 11), '2026-11-21')).toBe('seco');
  });
});
