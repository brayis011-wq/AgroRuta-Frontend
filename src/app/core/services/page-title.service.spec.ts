import { describe, expect, it } from 'vitest';
import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { TituloPaginaService } from './page-title.service';

/** Un DestroyRef que se puede disparar a mano */
function destruible() {
  const callbacks: (() => void)[] = [];
  const ref = { onDestroy: (fn: () => void) => { callbacks.push(fn); return () => {}; }, destroyed: false } as unknown as DestroyRef;
  return { ref, destruir: () => callbacks.forEach((fn) => fn()) };
}

describe('TituloPaginaService', () => {
  function preparar() {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', { layout: { nav: { payrolls: 'Nóminas' } } });
    translate.use('es');
    return { servicio: TestBed.inject(TituloPaginaService), title: TestBed.inject(Title) };
  }

  it('traduce la clave de la ruta y agrega el nombre de la app', () => {
    const { servicio, title } = preparar();
    servicio.clave.set('layout.nav.payrolls');
    TestBed.tick();
    expect(title.getTitle()).toBe('Nóminas · AgroRuta');
  });

  it('sin clave, o con una clave sin traducir, deja solo el nombre de la app', () => {
    const { servicio, title } = preparar();
    servicio.clave.set(null);
    TestBed.tick();
    expect(title.getTitle()).toBe('AgroRuta');
    servicio.clave.set('no.existe');
    TestBed.tick();
    expect(title.getTitle()).toBe('AgroRuta');
  });

  it('el texto de la pantalla manda mientras está abierta', () => {
    const { servicio, title } = preparar();
    servicio.clave.set('layout.nav.payrolls');
    const detalle = signal<string | null>('Juan Pérez');
    const { ref, destruir } = destruible();
    servicio.usarDetalle(detalle, ref);
    TestBed.tick();
    expect(title.getTitle()).toBe('Juan Pérez · AgroRuta');

    // Mientras carga el nombre, se usa la clave de la ruta
    detalle.set(null);
    TestBed.tick();
    expect(title.getTitle()).toBe('Nóminas · AgroRuta');

    detalle.set('Ana Gómez');
    destruir();
    TestBed.tick();
    expect(title.getTitle()).toBe('Nóminas · AgroRuta');
  });
});
