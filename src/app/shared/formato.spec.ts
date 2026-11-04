import { formatoFecha, formatoNumero, formatoPesos } from './formato';

describe('formato', () => {
  it('formats a date-only string without shifting the day', () => {
    expect(formatoFecha('2026-10-01', 'es')).toContain('1');
    expect(formatoFecha('2026-10-01', 'es')).toMatch(/oct/i);
  });

  it('returns a dash for empty or invalid dates', () => {
    expect(formatoFecha(null, 'es')).toBe('—');
    expect(formatoFecha('no-es-fecha', 'es')).toBe('—');
  });

  it('formats numbers and pesos for Colombia', () => {
    expect(formatoNumero(1234.5, 'es', 1)).toBe('1.234,5');
    expect(formatoPesos(1500000, 'es')).toContain('1.500.000');
  });
});
