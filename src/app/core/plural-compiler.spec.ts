import { TranslateDefaultParser } from '@ngx-translate/core';
import { conSingular } from './plural-compiler';

describe('singular automático en las traducciones', () => {
  const parser = new TranslateDefaultParser();
  const t = conSingular(
    {
      farm: { count: '{{count}} fincas', countOne: '1 finca', all: 'Todas las fincas' },
      jornales: '{{count}} jornales · {{amount}}',
      jornalesOne: '1 jornal · {{amount}}',
      sinPar: '{{count}} lotes',
    },
    parser,
  ) as Record<string, any>;

  it('con count 1 usa la forma "One" y con otro número la plural', () => {
    expect(parser.interpolate(t['farm'].count, { count: 1 })).toBe('1 finca');
    expect(parser.interpolate(t['farm'].count, { count: 3 })).toBe('3 fincas');
    expect(parser.interpolate(t['farm'].count, { count: 0 })).toBe('0 fincas');
  });

  it('interpola los demás valores en las dos formas', () => {
    expect(parser.interpolate(t['jornales'], { count: 1, amount: '$ 65.000' })).toBe(
      '1 jornal · $ 65.000',
    );
    expect(parser.interpolate(t['jornales'], { count: 2, amount: '$ 130.000' })).toBe(
      '2 jornales · $ 130.000',
    );
  });

  it('deja igual los textos sin forma "One" y la propia clave "One"', () => {
    expect(t['sinPar']).toBe('{{count}} lotes');
    expect(t['farm'].all).toBe('Todas las fincas');
    expect(t['farm'].countOne).toBe('1 finca');
  });

  it('sin parámetros usa la forma plural', () => {
    expect(parser.interpolate(t['farm'].count, undefined)).toBe('{{count}} fincas');
  });
});
