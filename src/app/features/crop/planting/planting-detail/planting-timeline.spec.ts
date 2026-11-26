import { ActividadCultivo, Cosecha, Fumigacion } from '../../../../core/models/crop.model';
import { armarHistorial } from './planting-timeline';

const textos = { num: (v: number) => String(v), unidad: (u: string) => u.toLowerCase() };

describe('armarHistorial', () => {
  const abonado = {
    id: 1,
    fecha: '2026-11-02',
    tipo: 'ABONADO',
    descripcion: 'Abono al pie',
    producto: 'Abono 15-15-15',
    cantidadUsada: 50,
    unidadCantidad: 'KG',
  } as ActividadCultivo;
  const fumigacion = {
    id: 2,
    fecha: '2026-11-10',
    producto: 'Mancozeb',
    dosis: 2.5,
    unidadMedida: 'LITROS',
    areaAplicada: 1,
    diasCarencia: 7,
  } as Fumigacion;
  const cosecha = {
    id: 3,
    fecha: '2026-11-05',
    cantidadKg: 120,
    calidad: 'PRIMERA',
    recolectores: [{}, {}],
  } as unknown as Cosecha;

  it('junta los tres tipos, de lo más reciente a lo más viejo', () => {
    const h = armarHistorial([abonado], [fumigacion], [cosecha], textos);
    expect(h.map((i) => i.tipo)).toEqual(['fumigacion', 'cosecha', 'actividad']);
  });

  it('describe el insumo de la actividad con su cantidad y unidad', () => {
    const [a] = armarHistorial([abonado], [], [], textos);
    expect(a.tituloKey).toBe('enums.tipoActividad.ABONADO');
    expect(a.extra).toBe('Abono 15-15-15 · 50 kg');
  });

  it('la cosecha lleva sus kilos y cuántos la recogieron; la fumigación, su carencia', () => {
    const h = armarHistorial([], [fumigacion], [cosecha], textos);
    const c = h.find((i) => i.tipo === 'cosecha')!;
    expect(c.titulo).toBe('120 kg');
    expect(c.recolectores).toBe(2);
    expect(c.enCarencia).toBe(false);
    expect(h.find((i) => i.tipo === 'fumigacion')!.carencia).toBe(7);
  });
});
