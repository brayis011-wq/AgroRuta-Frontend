import { enUnidadGrande, formatoCantidad, unidadBaseDe, unidadGrande, unidadesDe } from './inventory.model';

describe('inventario.model', () => {
  it('formatoCantidad pasa a litros o kilos desde 1000', () => {
    expect(formatoCantidad(2500, 'ML')).toBe('2,5 L');
    expect(formatoCantidad(750, 'ML')).toBe('750 ml');
    expect(formatoCantidad(1200, 'GRAMOS')).toBe('1,2 kg');
    expect(formatoCantidad(300, 'GRAMOS')).toBe('300 g');
    expect(formatoCantidad(-200, 'GRAMOS')).toBe('-200 g');
    expect(formatoCantidad(null, 'ML')).toBe('—');
  });

  it('formatoCantidad respeta el idioma', () => {
    expect(formatoCantidad(2500, 'ML', 'en-US')).toBe('2.5 L');
  });

  it('las unidades de un insumo son las de su mismo tipo', () => {
    expect(unidadesDe('ML')).toEqual(['LITROS', 'ML']);
    expect(unidadesDe('GRAMOS')).toEqual(['KG', 'GRAMOS']);
    expect(unidadBaseDe('LITROS')).toBe('ML');
    expect(unidadBaseDe('KG')).toBe('GRAMOS');
    expect(unidadGrande('GRAMOS')).toBe('KG');
  });

  it('enUnidadGrande convierte ml o g a litros o kilos', () => {
    expect(enUnidadGrande(2500)).toBe(2.5);
    expect(enUnidadGrande(125)).toBe(0.125);
  });
});
