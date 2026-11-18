import { vi } from 'vitest';
import { DIFERENCIA_MAXIMA, emparejarColumnas } from './dashboard-columns';

/** Arma el cuerpo del Inicio con columnas de las alturas dadas (jsdom no calcula tamaños: se simulan) */
function armar(izquierda: number[], derecha: number[], display = 'flex') {
  const cuerpo = document.createElement('div');
  const col = (clase: string, altos: number[]) => {
    const c = document.createElement('div');
    c.className = clase;
    c.style.display = display;
    altos.forEach((h) => {
      const t = document.createElement('section');
      t.getBoundingClientRect = () => ({ height: h } as DOMRect);
      c.appendChild(t);
    });
    const total = altos.reduce((s, h) => s + h, 0) + Math.max(0, altos.filter((h) => h > 0).length - 1) * 16;
    c.getBoundingClientRect = () => ({ height: total } as DOMRect);
    cuerpo.appendChild(c);
    return c;
  };
  const izq = col('col-principal', izquierda);
  const der = col('col-lateral', derecha);
  document.body.appendChild(cuerpo);
  return { cuerpo, izq, der };
}

describe('emparejarColumnas', () => {
  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('shares the missing height among the cards of the shorter column when the heights are close', () => {
    const { cuerpo, izq, der } = armar([150, 145, 190], [310, 330]);

    emparejarColumnas(cuerpo);

    expect(cuerpo.classList.contains('parejo')).toBe(true);
    expect(Array.from(izq.children).every((c) => c.classList.contains('estira'))).toBe(true);
    expect(der.querySelector('.estira')).toBeNull();
  });

  it('skips cards that are not shown (a component with nothing to say)', () => {
    const { cuerpo, izq } = armar([150, 300, 0], [310, 200]);

    emparejarColumnas(cuerpo);

    expect(izq.children[0].classList.contains('estira')).toBe(true);
    expect(izq.children[1].classList.contains('estira')).toBe(true);
    expect(izq.children[2].classList.contains('estira')).toBe(false);
  });

  it('never stretches a card marked as fixed (the weather)', () => {
    const { cuerpo, der } = armar([310, 330, 120], [247, 400]);
    der.children[0].classList.add('fijo');

    emparejarColumnas(cuerpo);

    expect(der.children[0].classList.contains('estira')).toBe(false);
    expect(der.children[1].classList.contains('estira')).toBe(true);
  });

  it('leaves every card at its own size when one side has little information', () => {
    const { cuerpo } = armar([150, 145], [310, 20, 330 + DIFERENCIA_MAXIMA]);

    emparejarColumnas(cuerpo);

    expect(cuerpo.classList.contains('parejo')).toBe(false);
    expect(cuerpo.querySelector('.estira')).toBeNull();
  });

  it('undoes a previous pairing when the data changes', () => {
    const { cuerpo, izq, der } = armar([150, 145, 190], [310, 330]);
    emparejarColumnas(cuerpo);
    der.getBoundingClientRect = () => ({ height: 1200 } as DOMRect);

    emparejarColumnas(cuerpo);

    expect(cuerpo.classList.contains('parejo')).toBe(false);
    expect(izq.querySelector('.estira')).toBeNull();
  });

  it('does nothing when everything goes in one column (narrow screens)', () => {
    const { cuerpo } = armar([150, 145, 190], [310, 330], 'contents');

    emparejarColumnas(cuerpo);

    expect(cuerpo.classList.contains('parejo')).toBe(false);
  });

  it('tolerates a missing body', () => {
    expect(() => emparejarColumnas(undefined)).not.toThrow();
  });
});
