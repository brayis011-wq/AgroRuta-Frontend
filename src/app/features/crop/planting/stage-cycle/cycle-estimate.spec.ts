import { duracionDe, estimarCiclo } from './cycle-estimate';
import { Siembra } from '../../../../core/models/crop.model';

const siembra = (tipo: string, estado: Siembra['estadoCultivo'], fechaSiembra = '2026-01-01') =>
  ({
    id: 1,
    tipoCultivo: tipo,
    variedad: 'X',
    estadoCultivo: estado,
    fechaSiembra,
    cantidadPlantas: 10,
    loteId: 1,
  }) as Siembra;

describe('Ciclo estimado por cultivo', () => {
  it('reconoce el cultivo sin tildes ni mayúsculas, y usa tiempos generales si no lo conoce', () => {
    expect(duracionDe('Café').conocido).toBe(true);
    expect(duracionDe('FRÍJOL').dias.CRECIMIENTO).toBe(30);
    expect(duracionDe('Plátano hartón').perenne).toBe(true);
    const otro = duracionDe('Quinua');
    expect(otro.conocido).toBe(false);
    expect(otro.dias.GERMINACION).toBe(20);
  });

  it('estima cuándo empieza cada etapa desde la etapa actual', () => {
    // Fríjol: germ 10, crec 30, prod 30, cosecha 20 (ciclo corto: termina la temporada)
    const e = estimarCiclo(siembra('Fríjol', 'GERMINACION'), [], '2026-01-05');
    expect(e.fechas.CRECIMIENTO).toBe('2026-01-11');
    expect(e.fechas.PRODUCCION).toBe('2026-02-10');
    expect(e.fechas.COSECHA).toBe('2026-03-12');
    expect(e.fechas.FINALIZADO).toBe('2026-04-01');
    expect(e.sugerida).toBeNull();
  });

  it('cuando ya pasaron los días normales sugiere la siguiente etapa, contando desde que empezó la actual', () => {
    const etapas = [{ id: 1, siembraId: 1, etapa: 'CRECIMIENTO' as const, fecha: '2026-01-20' }];
    const e = estimarCiclo(siembra('Fríjol', 'CRECIMIENTO'), etapas, '2026-02-25');
    expect(e.sugerida).toBe('PRODUCCION');
    expect(e.desde).toBe('2026-02-19');
    expect(e.diasNormales).toBe(30);
  });

  it('un cultivo de ciclo corto en cosecha sugiere terminar; uno perenne sigue cosechando', () => {
    const corto = estimarCiclo(siembra('Papa', 'COSECHA', '2026-01-01'), [], '2026-03-01');
    expect(corto.sugerida).toBe('FINALIZADO');
    const perenne = estimarCiclo(siembra('Café', 'COSECHA', '2024-01-01'), [], '2026-03-01');
    expect(perenne.sugerida).toBeNull();
    expect(perenne.fechas.FINALIZADO).toBeUndefined();
  });
});
