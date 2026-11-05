import { describe, it, expect } from 'vitest';
import { AuthEscena } from './escena';

describe('AuthEscena.momentoDe', () => {
  it('de 5 a 11 es mañana', () => {
    expect(AuthEscena.momentoDe(5)).toBe('manana');
    expect(AuthEscena.momentoDe(11)).toBe('manana');
  });
  it('de 12 a 17 es tarde', () => {
    expect(AuthEscena.momentoDe(12)).toBe('tarde');
    expect(AuthEscena.momentoDe(17)).toBe('tarde');
  });
  it('de 18 a 4 es noche', () => {
    expect(AuthEscena.momentoDe(18)).toBe('noche');
    expect(AuthEscena.momentoDe(0)).toBe('noche');
    expect(AuthEscena.momentoDe(4)).toBe('noche');
  });
});
