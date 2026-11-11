import { escaparHtml } from './html';

describe('escaparHtml', () => {
  it('deja el texto normal igual', () => {
    expect(escaparHtml('Finca La Esperanza 2')).toBe('Finca La Esperanza 2');
  });

  it('neutraliza las etiquetas', () => {
    const salida = escaparHtml('<img src=x onerror="alert(1)">');
    expect(salida).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(salida).not.toContain('<');
  });

  it('escapa comillas y el signo &', () => {
    expect(escaparHtml(`Tom & "Ana" d'Oro`)).toBe('Tom &amp; &quot;Ana&quot; d&#39;Oro');
  });

  it('acepta números y valores vacíos', () => {
    expect(escaparHtml(12.5)).toBe('12.5');
    expect(escaparHtml(null)).toBe('');
    expect(escaparHtml(undefined)).toBe('');
  });
});
