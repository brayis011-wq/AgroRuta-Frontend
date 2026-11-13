import { describe, expect, it } from 'vitest';
import { abreTeclado, barraOcultaTras } from './scroll-bar';

describe('barra inferior al deslizar', () => {
  const mover = (oculta: boolean, antes: number, ahora: number, maximo = 2000) => barraOcultaTras(oculta, { antes, ahora, maximo });

  it('se esconde al bajar y vuelve al subir', () => {
    expect(mover(false, 200, 260)).toBe(true);
    expect(mover(true, 600, 560)).toBe(false);
  });

  it('cerca del inicio siempre está a la vista', () => {
    expect(mover(true, 300, 40)).toBe(false);
    expect(mover(false, 0, 60)).toBe(false);
  });

  it('al llegar al final de la página vuelve a mostrarse', () => {
    expect(mover(false, 1700, 1800)).toBe(true);
    expect(mover(true, 1900, 1990)).toBe(false);
    expect(mover(true, 1990, 2000)).toBe(false);
  });

  it('un movimiento mínimo no la cambia', () => {
    expect(mover(false, 400, 404)).toBe(false);
    expect(mover(true, 400, 396)).toBe(true);
  });

  it('el rebote del navegador más allá del final no la muestra ni la esconde', () => {
    expect(mover(true, 2000, 2030, 2000)).toBe(true);
    expect(mover(false, 1990, 2040, 2000)).toBe(false);
    expect(mover(true, 500, -20)).toBe(false);   // por encima del inicio: zona alta
  });

  it('reconoce los campos que abren el teclado', () => {
    const campo = (tipo: string) => Object.assign(document.createElement('input'), { type: tipo });
    expect(abreTeclado(campo('text'))).toBe(true);
    expect(abreTeclado(campo('number'))).toBe(true);
    expect(abreTeclado(document.createElement('textarea'))).toBe(true);
    expect(abreTeclado(campo('checkbox'))).toBe(false);
    expect(abreTeclado(campo('file'))).toBe(false);
    expect(abreTeclado(document.createElement('button'))).toBe(false);
    expect(abreTeclado(null)).toBe(false);
  });
});
