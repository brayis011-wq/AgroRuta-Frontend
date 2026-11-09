import { Siembra, EtapaSiembra } from '../../../../core/models/crop.model';
import { diasEntre, diasEnEtapa, fechaMinima, pasosCiclo, progresoCiclo, siguienteEtapa } from './stage-cycle.logic';

const siembra = (estadoCultivo: Siembra['estadoCultivo'], extra: Partial<Siembra> = {}): Siembra => ({
  id: 1, fechaSiembra: '2026-01-10', cantidadPlantas: 100, variedad: 'Castillo', tipoCultivo: 'Café',
  estadoCultivo, loteId: 3, ...extra,
});
const etapa = (e: EtapaSiembra['etapa'], fecha: string, id = 1): EtapaSiembra => ({ id, siembraId: 1, etapa: e, fecha });

describe('ciclo de etapas', () => {
  it('marca hechas, actual y pendientes con sus fechas', () => {
    const pasos = pasosCiclo(siembra('PRODUCCION'), [
      etapa('GERMINACION', '2026-01-10'), etapa('CRECIMIENTO', '2026-02-01', 2), etapa('PRODUCCION', '2026-04-15', 3),
    ]);
    expect(pasos.map(p => p.estado)).toEqual(['hecho', 'hecho', 'actual', 'pendiente', 'pendiente']);
    expect(pasos[1].fecha).toBe('2026-02-01');
    expect(pasos[3].fecha).toBeNull();
  });

  it('las siembras antiguas usan la fecha de siembra para la germinación y la de fin para el cierre', () => {
    const pasos = pasosCiclo(siembra('FINALIZADO', { fechaFin: '2026-09-01' }), []);
    expect(pasos[0].fecha).toBe('2026-01-10');
    expect(pasos[2].fecha).toBeNull();
    expect(pasos[4]).toEqual({ etapa: 'FINALIZADO', estado: 'hecho', fecha: '2026-09-01' });
  });

  it('si retrocedió y volvió a avanzar toma el último registro', () => {
    const pasos = pasosCiclo(siembra('CRECIMIENTO'), [etapa('CRECIMIENTO', '2026-02-01'), etapa('CRECIMIENTO', '2026-02-09', 2)]);
    expect(pasos[1].fecha).toBe('2026-02-09');
  });

  it('desde cosecha no se avanza: se termina la temporada', () => {
    expect(siguienteEtapa('GERMINACION')).toBe('CRECIMIENTO');
    expect(siguienteEtapa('COSECHA')).toBeNull();
    expect(siguienteEtapa('FINALIZADO')).toBeNull();
  });

  it('la fecha mínima es el último cambio registrado', () => {
    expect(fechaMinima(siembra('CRECIMIENTO'), [etapa('GERMINACION', '2026-01-10'), etapa('CRECIMIENTO', '2026-03-02')])).toBe('2026-03-02');
    expect(fechaMinima(siembra('GERMINACION'), [])).toBe('2026-01-10');
  });

  it('cuenta días sin correrse por la zona horaria', () => {
    expect(diasEntre('2026-01-10', '2026-01-31')).toBe(21);
    expect(diasEntre('2026-03-01', '2026-02-01')).toBe(0);
    expect(diasEnEtapa(siembra('CRECIMIENTO'), [etapa('CRECIMIENTO', '2026-02-01')], '2026-02-11')).toBe(10);
  });

  it('el avance va de 0 a 100', () => {
    expect(progresoCiclo('GERMINACION')).toBe(0);
    expect(progresoCiclo('PRODUCCION')).toBe(50);
    expect(progresoCiclo('FINALIZADO')).toBe(100);
  });
});
