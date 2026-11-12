import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContarDirective, decimalesDe } from './count-up.directive';

@Component({
  imports: [ContarDirective],
  template: `<strong [arContar]="valor()" [formato]="formato"></strong>`,
})
class Anfitrion {
  readonly valor = signal<number | null>(1200);
  readonly formato = (v: number) => `$ ${v}`;
}

describe('ContarDirective', () => {
  let cuadros: FrameRequestCallback[];
  const avanzar = (ms: number) => cuadros.splice(0).forEach((c) => c(ms));

  beforeEach(() => {
    cuadros = [];
    vi.stubGlobal('requestAnimationFrame', (c: FrameRequestCallback) => cuadros.push(c));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => vi.unstubAllGlobals());

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('strong')!.textContent;

  it('sube desde cero hasta el valor, con el formato de la pantalla', () => {
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    expect(texto(f)).toBe('$ 0');

    avanzar(1000);          // primer cuadro: marca el inicio
    avanzar(1000 + 200);    // a medio camino
    const medio = Number(texto(f)!.slice(2));
    expect(medio).toBeGreaterThan(0);
    expect(medio).toBeLessThan(1200);

    avanzar(1000 + 5000);
    expect(texto(f)).toBe('$ 1200');
    expect(cuadros.length).toBe(0);
  });

  it('si el valor cambia, sigue desde lo que se estaba mostrando', () => {
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    avanzar(0);
    avanzar(5000);
    f.componentInstance.valor.set(1500);
    f.detectChanges();
    expect(texto(f)).toBe('$ 1200');
    avanzar(1);
    avanzar(5000);
    expect(texto(f)).toBe('$ 1500');
  });

  it('sin animaciones muestra el valor de una vez', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    expect(texto(f)).toBe('$ 1200');

    f.componentInstance.valor.set(null);
    f.detectChanges();
    expect(texto(f)).toBe('$ 0');
  });

  it('conserva los decimales del valor final', () => {
    expect(decimalesDe(12)).toBe(0);
    expect(decimalesDe(12.5)).toBe(1);
    expect(decimalesDe(3.14159)).toBe(2);
    expect(decimalesDe(Number.NaN)).toBe(0);
  });
});
