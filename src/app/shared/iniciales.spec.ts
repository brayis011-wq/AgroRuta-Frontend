import { iniciales } from './iniciales';

describe('iniciales', () => {
  it('uses the first letter of the name and of the surname', () => {
    expect(iniciales('Juan Carlos', 'Pérez Gómez')).toBe('JP');
    expect(iniciales(' ángela ', 'ñustes')).toBe('ÁÑ');
  });

  it('uses the first two words of a full name', () => {
    expect(iniciales('Ana María Rojas')).toBe('AM');
    expect(iniciales('Luis')).toBe('L');
  });

  it('works with a missing surname', () => {
    expect(iniciales('Luis', null)).toBe('L');
    expect(iniciales(undefined, 'Rojas')).toBe('R');
  });

  it('returns a question mark when there is nothing to show', () => {
    expect(iniciales('')).toBe('?');
    expect(iniciales(null, '  ')).toBe('?');
    expect(iniciales(undefined)).toBe('?');
  });
});
