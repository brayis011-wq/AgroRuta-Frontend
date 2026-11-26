import { describe, expect, it, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { CultivoService } from '../../core/services/crop.service';
import { MigasCultivoComponent, armarMigas } from './crop-breadcrumbs';

const sinIds = { finca: null, lote: null, siembra: null };

describe('armarMigas', () => {
  it('sin ids solo muestra Mis fincas y la acción actual', () => {
    expect(armarMigas(sinIds, {}, 'cultivo.fincas.new.title')).toEqual([
      { clave: 'cultivo.fincas.list.title', ruta: ['/crops'] },
      { clave: 'cultivo.fincas.new.title' },
    ]);
  });

  it('mientras carga deja huecos con el enlace que ya se conoce', () => {
    const items = armarMigas({ ...sinIds, siembra: 9 }, {}, null);
    expect(items).toHaveLength(4);
    expect(items[1]).toEqual({ texto: null, ruta: null }); // finca: aún no se sabe cuál
    expect(items[2]).toEqual({ texto: null, ruta: null }); // lote: tampoco
    expect(items[3]).toEqual({ texto: null, ruta: ['/crops/planting', 9] });
  });

  it('con todo cargado arma Finca › Lote › Siembra › acción', () => {
    const items = armarMigas(
      { ...sinIds, siembra: 9 },
      {
        fincaId: 1,
        finca: 'La Esperanza',
        loteId: 3,
        lote: 'Lote 3',
        siembraId: 9,
        siembra: 'Café · Castillo',
      },
      'siembra.harvest.title',
    );
    expect(items).toEqual([
      { clave: 'cultivo.fincas.list.title', ruta: ['/crops'] },
      { texto: 'La Esperanza', ruta: ['/crops/farm', 1] },
      { texto: 'Lote 3', ruta: ['/crops/plot', 3] },
      { texto: 'Café · Castillo', ruta: ['/crops/planting', 9] },
      { clave: 'siembra.harvest.title' },
    ]);
  });

  it('si falla la carga usa nombres genéricos en vez de huecos eternos', () => {
    const items = armarMigas({ ...sinIds, lote: 3 }, { fallo: true }, null);
    expect(items[1]).toEqual({ clave: 'titles.farm', ruta: null });
    expect(items[2]).toEqual({ clave: 'temporadas.lote.eyebrow', ruta: ['/crops/plot', 3] });
  });

  it('una siembra sin nombre de cultivo se llama "Siembra"', () => {
    const items = armarMigas(
      { ...sinIds, siembra: 9 },
      { fincaId: 1, finca: 'F', loteId: 3, lote: 'L', siembra: '' },
      null,
    );
    expect(items[3]).toEqual({ clave: 'temporadas.ui.planting', ruta: ['/crops/planting', 9] });
  });
});

@Component({
  standalone: true,
  imports: [MigasCultivoComponent],
  template: `<app-migas-cultivo [lote]="lote()" actual="siembra.new.title" />`,
})
class Anfitrion {
  readonly lote = signal<number | null>(3);
}

describe('MigasCultivoComponent', () => {
  function montar(cultivo: Partial<CultivoService>) {
    TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [provideRouter([]), { provide: CultivoService, useValue: cultivo }],
    });
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    return fixture;
  }

  it('busca el lote y su finca, y muestra el camino con enlaces', () => {
    const cultivo = {
      buscarLote: vi.fn().mockReturnValue(of({ id: 3, nombre: 'Lote 3', fincaId: 1 })),
      buscarFinca: vi.fn().mockReturnValue(of({ id: 1, nombre: 'La Esperanza' })),
    };
    const fixture = montar(cultivo as unknown as CultivoService);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const enlaces = [...el.querySelectorAll('ol a')].map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(enlaces).toEqual([
      ['cultivo.fincas.list.title', '/crops'], // sin archivos de idioma en la prueba, se ve la clave
      ['La Esperanza', '/crops/farm/1'],
      ['Lote 3', '/crops/plot/3'],
    ]);
    expect(el.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
      'siembra.new.title',
    );
    // En el celular, el botón de volver lleva al lote
    expect(el.querySelector('a.atras')?.getAttribute('href')).toBe('/crops/plot/3');
  });

  it('pone el título de la pestaña con la acción y el lote', async () => {
    const cultivo = {
      buscarLote: vi.fn().mockReturnValue(of({ id: 3, nombre: 'Lote 3', fincaId: 1 })),
      buscarFinca: vi.fn().mockReturnValue(of({ id: 1, nombre: 'La Esperanza' })),
    };
    const fixture = montar(cultivo as unknown as CultivoService);
    await fixture.whenStable();
    expect(TestBed.inject(Title).getTitle()).toBe('siembra.new.title · Lote 3 · AgroRuta');
  });

  it('si el servidor falla no rompe la pantalla', () => {
    const cultivo = { buscarLote: vi.fn().mockReturnValue(throwError(() => new Error('500'))) };
    const fixture = montar(cultivo as unknown as CultivoService);
    fixture.detectChanges();
    const textos = [...fixture.nativeElement.querySelectorAll('ol li')].map((li: Element) =>
      li.textContent?.trim(),
    );
    expect(textos).toEqual([
      'cultivo.fincas.list.title',
      'titles.farm',
      'temporadas.lote.eyebrow',
      'siembra.new.title',
    ]);
  });
});
