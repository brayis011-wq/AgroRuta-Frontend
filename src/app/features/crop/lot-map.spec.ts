import { describe, expect, it } from 'vitest';
import { colorEstadoLote, puntosDelLote } from './lot-map';

describe('lot-map', () => {
  it('un color por estado, y en cultivo si el estado no se conoce', () => {
    expect(colorEstadoLote('DISPONIBLE')).toBe('#1f5fa8');
    expect(colorEstadoLote('EN_DESCANSO')).toBe('#b26a00');
    expect(colorEstadoLote('OTRO')).toBe(colorEstadoLote('EN_CULTIVO'));
    expect(colorEstadoLote(null)).toBe(colorEstadoLote('EN_CULTIVO'));
  });

  it('lee las coordenadas guardadas y descarta las que no forman un polígono', () => {
    expect(puntosDelLote('[[4.1,-74.2],[4.2,-74.2],[4.2,-74.1]]')).toEqual([[4.1, -74.2], [4.2, -74.2], [4.2, -74.1]]);
    expect(puntosDelLote('[[4.1,-74.2],[4.2,-74.2]]')).toBeNull();     // dos puntos no son un polígono
    expect(puntosDelLote('no es json')).toBeNull();
    expect(puntosDelLote('{"a":1}')).toBeNull();
    expect(puntosDelLote(null)).toBeNull();
    expect(puntosDelLote('[[4.1,-74.2],["x",1],[4.2,-74.2],[4.2,-74.1]]')).toHaveLength(3); // ignora el punto malo
  });
});
