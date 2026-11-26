import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AyudaComponent, posicionBurbuja } from './help-tip';

describe('posicionBurbuja', () => {
  it('queda centrada debajo del botón', () => {
    expect(posicionBurbuja({ top: 100, bottom: 122, left: 500, width: 22 }, 1366, 800)).toEqual({
      top: 130,
      left: 371,
    });
  });

  it('no se sale por los bordes de la pantalla', () => {
    expect(posicionBurbuja({ top: 100, bottom: 122, left: 2, width: 22 }, 390, 800).left).toBe(12);
    // A la derecha de un celular: 390 - 280 - 12
    expect(posicionBurbuja({ top: 100, bottom: 122, left: 370, width: 22 }, 390, 800).left).toBe(
      98,
    );
  });

  it('se abre hacia arriba si no cabe abajo', () => {
    expect(posicionBurbuja({ top: 760, bottom: 782, left: 100, width: 22 }, 1366, 800).top).toBe(
      632,
    );
  });
});

describe('AyudaComponent', () => {
  function montar() {
    const fixture = TestBed.createComponent(AyudaComponent);
    fixture.componentRef.setInput('clave', 'help.carencia');
    fixture.componentRef.setInput('termino', 'help.carenciaTerm');
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    return fixture;
  }

  it('se abre con clic, enlaza la explicación y se cierra con Esc', () => {
    const fixture = montar();
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(boton.getAttribute('aria-expanded')).toBe('false');

    boton.click();
    fixture.detectChanges();
    const burbuja: HTMLElement = fixture.nativeElement.querySelector('.burbuja');
    expect(burbuja.textContent).toContain('help.carencia');
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-controls')).toBe(burbuja.id);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.burbuja')).toBeNull();
    expect(document.activeElement).toBe(boton);
    fixture.nativeElement.remove();
  });

  it('desplazar la página no la cierra (sigue al botón)', () => {
    const fixture = montar();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    document.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.burbuja')).not.toBeNull();
    fixture.nativeElement.remove();
  });

  it('un clic afuera la cierra; otro clic en el botón también', () => {
    const fixture = montar();
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    boton.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.burbuja')).toBeNull();

    boton.click();
    boton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.burbuja')).toBeNull();
    fixture.nativeElement.remove();
  });
});
