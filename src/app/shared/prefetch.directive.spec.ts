import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CultivoService } from '../core/services/crop.service';
import { PrecargarDirective, olvidarPrecargas } from './prefetch.directive';

@Component({
  standalone: true,
  imports: [PrecargarDirective],
  template: `<a [arPrecargar]="{ tipo: 'planting', id: 7 }">Café</a>`,
})
class Prueba {}

describe('PrecargarDirective', () => {
  const cultivo = {
    buscarSiembra: vi.fn(() => of({})), listarActividades: vi.fn(() => of([])),
    listarFumigaciones: vi.fn(() => of([])), listarCosechas: vi.fn(() => of([])),
    buscarLote: vi.fn(() => of({})), historialLote: vi.fn(() => of([])),
  };

  beforeEach(() => {
    olvidarPrecargas();
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [Prueba], providers: [{ provide: CultivoService, useValue: cultivo }] });
  });

  it('al tocar el enlace pide los datos de la siembra una sola vez', () => {
    const f = TestBed.createComponent(Prueba);
    f.detectChanges();
    const a = f.nativeElement.querySelector('a') as HTMLElement;
    a.dispatchEvent(new Event('touchstart'));
    a.dispatchEvent(new Event('touchstart'));
    expect(cultivo.buscarSiembra).toHaveBeenCalledTimes(1);
    expect(cultivo.listarCosechas).toHaveBeenCalledWith(7);
  });

  it('pasar el ratón de largo no pide nada', () => {
    vi.useFakeTimers();
    const f = TestBed.createComponent(Prueba);
    f.detectChanges();
    const a = f.nativeElement.querySelector('a') as HTMLElement;
    a.dispatchEvent(new Event('mouseenter'));
    a.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(200);
    expect(cultivo.buscarSiembra).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
