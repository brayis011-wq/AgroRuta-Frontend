import { describe, expect, it } from 'vitest';
import { AvisoBandeja } from '../../core/services/inbox.service';
import { haceCuanto, textoAviso } from './inbox-text';

/** Traducción de prueba: devuelve la clave con sus parámetros, para ver qué se pidió */
const t = (clave: string, p?: Record<string, unknown>) => (p ? `${clave} ${JSON.stringify(p)}` : clave);

const aviso = (parcial: Partial<AvisoBandeja>): AvisoBandeja => ({
  id: 1, tipo: null, titulo: 'Título del servidor', cuerpo: 'Cuerpo del servidor', datos: {}, ruta: null,
  creadoEn: '2026-11-18T12:00:00Z', leido: false, ...parcial,
});

describe('textoAviso', () => {
  it('pago: monto en pesos y periodo con fechas del idioma', () => {
    const r = textoAviso(aviso({ tipo: 'PAGO_REGISTRADO', datos: { monto: '650000', inicio: '2026-10-01', fin: '2026-10-15' } }), t, 'es');
    expect(r.titulo).toBe('inbox.types.PAGO_REGISTRADO.title');
    expect(r.cuerpo).toContain('650.000');
    expect(r.cuerpo).toContain('inbox.period');
    expect(r.icono).toBe('ti-cash');
  });

  it('solicitud de acceso: con el nombre del trabajador', () => {
    const r = textoAviso(aviso({ tipo: 'ACCESO_SOLICITADO', datos: { trabajador: 'Pedro Gómez' } }), t, 'es');
    expect(r.cuerpo).toBe('inbox.types.ACCESO_SOLICITADO.body {"worker":"Pedro Gómez"}');
  });

  it('acceso resuelto: aprobado, rechazado o retirado; sin empleador usa "tu empleador"', () => {
    expect(textoAviso(aviso({ tipo: 'ACCESO_RESUELTO', datos: { aprobado: true, empleador: 'Carlos' } }), t, 'es').titulo)
      .toBe('inbox.types.ACCESO_RESUELTO.approved.title');
    expect(textoAviso(aviso({ tipo: 'ACCESO_RESUELTO', datos: { aprobado: false, retirado: true } }), t, 'es').titulo)
      .toBe('inbox.types.ACCESO_RESUELTO.removed.title');
    const rechazo = textoAviso(aviso({ tipo: 'ACCESO_RESUELTO', datos: { aprobado: false, retirado: false, empleador: '' } }), t, 'es');
    expect(rechazo.titulo).toBe('inbox.types.ACCESO_RESUELTO.rejected.title');
    expect(rechazo.cuerpo).toContain('"employer":"inbox.yourEmployer"');
  });

  it('resumen del día: en español usa el texto del servidor; en inglés lo arma con los conteos', () => {
    const a = aviso({ tipo: 'RESUMEN_DIA', cuerpo: 'Lote 1: no fumigues hoy · 2 avisos del cultivo', datos: { alertas: 2, clima: 0, insumos: 1 } });
    expect(textoAviso(a, t, 'es').cuerpo).toBe('Lote 1: no fumigues hoy · 2 avisos del cultivo');
    expect(textoAviso(a, t, 'en').cuerpo).toBe('inbox.summary.alertas {"count":2} · inbox.summary.insumos {"count":1}');
  });

  it('un tipo desconocido muestra el texto que guardó el servidor', () => {
    expect(textoAviso(aviso({ tipo: null }), t, 'en')).toMatchObject({ titulo: 'Título del servidor', cuerpo: 'Cuerpo del servidor' });
  });
});

describe('haceCuanto', () => {
  const ahora = Date.parse('2026-11-18T12:00:00Z');
  it('minutos, horas y días en el idioma', () => {
    expect(haceCuanto('2026-11-18T11:55:00Z', 'es', ahora)).toBe('hace 5 minutos');
    expect(haceCuanto('2026-11-18T09:00:00Z', 'en', ahora)).toBe('3 hours ago');
    expect(haceCuanto('2026-11-17T12:00:00Z', 'es', ahora)).toBe('ayer');
  });
  it('lo de hace más de una semana muestra la fecha', () => {
    expect(haceCuanto('2026-10-01T12:00:00Z', 'en', ahora)).toMatch(/Oct/);
  });
});
