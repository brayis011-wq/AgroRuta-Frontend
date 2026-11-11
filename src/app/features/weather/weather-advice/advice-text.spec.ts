import { ConsejoClima } from '../../../core/models/weather.model';
import { ahoraEnColombia, horaCorta, horasHasta, textoConsejo } from './advice-text';

/** Traductor de prueba: devuelve la clave con sus parámetros, para ver qué se armó */
const t = (clave: string, p?: Record<string, unknown>) => clave.replace('weather.advice.', '') + (p ? JSON.stringify(p) : '');

const consejo = (c: Partial<ConsejoClima>): ConsejoClima => ({
  tipo: 'NO_FUMIGAR', nivel: 'ALERTA', fincaId: 1, finca: 'La Esperanza', lote: 'Lote El Mango', cultivo: 'Café',
  dia: '2026-11-10', motivo: 'LLUVIA', problemaDesde: null, ventanaInicio: null, ventanaFin: null, valor: null, ...c,
});

describe('consejos de clima', () => {
  const AHORA = '2026-11-10T13:00';

  it('escribe la hora como se dice en el campo', () => {
    expect(horaCorta('2026-11-10T16:00:00', 'es')).toBe('4 p. m.');
    expect(horaCorta('2026-11-10T07:00:00', 'es')).toBe('7 a. m.');
    expect(horaCorta('2026-11-10T00:30:00', 'es')).toBe('12:30 a. m.');
    expect(horaCorta('2026-11-10T12:00:00', 'en')).toBe('12 PM');
    expect(horaCorta(null, 'es')).toBe('');
  });

  it('cuenta las horas que faltan y no da negativos', () => {
    expect(horasHasta('2026-11-10T16:00:00', AHORA)).toBe(3);
    expect(horasHasta('2026-11-10T10:00:00', AHORA)).toBe(0);
    expect(horasHasta(null, AHORA)).toBeNull();
  });

  it('da la hora de Colombia aunque el dispositivo esté en otra zona', () => {
    expect(ahoraEnColombia(new Date('2026-11-10T21:05:00Z'))).toBe('2026-11-10T16:05');
  });

  it('no fumigar: dice en cuántas horas llueve y cuándo sí se puede', () => {
    const x = textoConsejo(consejo({ problemaDesde: '2026-11-10T16:00:00', ventanaInicio: '2026-11-11T07:00:00', ventanaFin: '2026-11-11T13:00:00' }), AHORA, 'es', t);
    expect(x.titulo).toBe('noSpray{"dia":"today"}');
    expect(x.detalle).toContain('whyIn{"motivo":"reason.LLUVIA","n":3,"hora":"4 p. m."}');
    expect(x.detalle).toContain('better{"dia":"tomorrow","desde":"7 a. m.","hasta":"1 p. m."}');
  });

  it('si ya está lloviendo lo dice así, sin horas', () => {
    const x = textoConsejo(consejo({ problemaDesde: '2026-11-10T13:00:00' }), AHORA, 'es', t);
    expect(x.detalle).toBe('whyNow{"motivo":"reason.LLUVIA"}');
  });

  it('ventana para fumigar: el título es el rato que sirve', () => {
    const x = textoConsejo(consejo({ tipo: 'FUMIGAR_EN_VENTANA', nivel: 'PRECAUCION', motivo: 'VIENTO',
      problemaDesde: '2026-11-10T16:00:00', ventanaInicio: '2026-11-10T13:00:00', ventanaFin: '2026-11-10T16:00:00' }), AHORA, 'es', t);
    expect(x.titulo).toBe('sprayWindow{"dia":"today","desde":"1 p. m.","hasta":"4 p. m."}');
    expect(x.detalle).toContain('reason.VIENTO');
  });

  it('una tarea de mañana se nombra como mañana', () => {
    const x = textoConsejo(consejo({ tipo: 'FUMIGAR_BIEN', nivel: 'BIEN', dia: '2026-11-11', motivo: null }), AHORA, 'es', t);
    expect(x.titulo).toBe('sprayOk{"dia":"tomorrow"}');
  });

  it('helada y lluvia fuerte llevan su valor redondeado', () => {
    expect(textoConsejo(consejo({ tipo: 'HELADA', valor: 1.4, problemaDesde: '2026-11-11T04:00:00' }), AHORA, 'es', t).detalle)
      .toBe('frostSubAt{"temp":1,"hora":"4 a. m."}');
    expect(textoConsejo(consejo({ tipo: 'LLUVIA_FUERTE', valor: 24.6 }), AHORA, 'es', t).detalle).toBe('heavyRainSub{"mm":25,"hora":""}');
    expect(textoConsejo(consejo({ tipo: 'NO_REGAR', valor: 8 }), AHORA, 'es', t).titulo).toBe('noWater');
  });
});
