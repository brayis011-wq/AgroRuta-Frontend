import { describe, expect, it } from 'vitest';
import { alCruzar } from './reveal';

describe('bloques que asoman al deslizar', () => {
  const ALTO = 780;

  it('lo que ya se veía al abrir la pantalla se deja quieto', () => {
    expect(alCruzar(true, true, 120, ALTO)).toBe('dejar');
  });

  it('lo que está más abajo espera y asoma al entrar', () => {
    expect(alCruzar(false, true, 1400, ALTO)).toBe('esperar');
    expect(alCruzar(true, false, 750, ALTO)).toBe('asomar');
  });

  it('lo que quedó arriba (o no se muestra) no se anima', () => {
    expect(alCruzar(false, true, -300, ALTO)).toBe('dejar');
    expect(alCruzar(false, true, 0, ALTO)).toBe('dejar');
  });
});
