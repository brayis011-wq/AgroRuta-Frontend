import {
  agruparPorTipo,
  claseDeTipo,
  coincideBusqueda,
  convertirCantidad,
  normalizar,
} from './spraying-helpers';

describe('ayudas de la fumigación', () => {
  it('normaliza sin tildes ni mayúsculas', () => {
    expect(normalizar('  Fungicída ')).toBe('fungicida');
    expect(normalizar(null)).toBe('');
  });

  it('convierte entre unidades del mismo tipo con 3 decimales', () => {
    expect(convertirCantidad(2.5, 'LITROS', 'ML')).toBe(2500);
    expect(convertirCantidad(750, 'GRAMOS', 'KG')).toBe(0.75);
    expect(convertirCantidad(1, 'ML', 'LITROS')).toBe(0.001);
  });

  it('busca por nombre, por tipo o por tipo traducido', () => {
    expect(coincideBusqueda('manco', 'Mancozeb', 'FUNGICIDA', 'Fungicida')).toBe(true);
    expect(coincideBusqueda('fungi', 'Mancozeb', 'FUNGICIDA', 'Fungicida')).toBe(true);
    expect(coincideBusqueda('hongos', 'Mancozeb', 'FUNGICIDA', 'Contra hongos')).toBe(true);
    expect(coincideBusqueda('abono', 'Mancozeb', 'FUNGICIDA', 'Fungicida')).toBe(false);
    expect(coincideBusqueda('  ', 'Mancozeb', '', '')).toBe(true);
  });

  it('agrupa por tipo y ordena por el nombre traducido', () => {
    const nombres: Record<string, string> = { HERBICIDA: 'Herbicida', FUNGICIDA: 'Fungicida' };
    const grupos = agruparPorTipo(
      [
        { n: 'Glifosato', t: 'HERBICIDA' },
        { n: 'Mancozeb', t: 'FUNGICIDA' },
        { n: 'Paraquat', t: 'HERBICIDA' },
      ],
      (x) => x.t,
      (t) => nombres[t],
    );
    expect(grupos.map((g) => g.tipo)).toEqual(['FUNGICIDA', 'HERBICIDA']);
    expect(grupos[1].items.map((x) => x.n)).toEqual(['Glifosato', 'Paraquat']);
  });

  it('da la clase de color de cada tipo', () => {
    expect(claseDeTipo('FUNGICIDA')).toBe('badge-fungicida');
    expect(claseDeTipo('OTRO')).toBe('badge-default');
  });
});
