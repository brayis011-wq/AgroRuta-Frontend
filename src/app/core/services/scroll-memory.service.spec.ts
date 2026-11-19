import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { MemoriaScrollService, soloRuta } from './scroll-memory.service';

describe('MemoriaScrollService', () => {
  let eventos: Subject<unknown>;
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    eventos = new Subject();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { events: eventos } }] });
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    TestBed.inject(MemoriaScrollService).iniciar({ onDestroy: () => () => {} } as unknown as DestroyRef);
  });

  const ir = (id: number, url: string, trigger: 'imperative' | 'popstate' = 'imperative', vuelveA?: number) => {
    eventos.next(new NavigationStart(id, url, trigger, vuelveA != null ? { navigationId: vuelveA } : null));
    eventos.next(new NavigationEnd(id, url, url));
  };

  it('una página nueva empieza arriba', () => {
    ir(1, '/worker');
    ir(2, '/worker/payrolls');
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  });

  it('cambiar solo una pestaña o un filtro no mueve la página', () => {
    ir(1, '/crops/planting/32');
    scrollTo.mockClear();
    ir(2, '/crops/planting/32?tab=registros');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('con "atrás" vuelve a la posición guardada cuando la página ya es alta', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3000, configurable: true });
    ir(1, '/worker');
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });
    ir(2, '/worker/payrolls/61');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    ir(3, '/worker', 'popstate', 1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 640, behavior: 'instant' });
  });

  it('si la página aún no es alta, espera a que lleguen los datos (y se rinde a los 2,5 s)', () => {
    vi.useFakeTimers();
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 0, configurable: true });
    ir(1, '/worker');
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    ir(2, '/worker/payrolls/61');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    scrollTo.mockClear();
    ir(3, '/worker', 'popstate', 1);
    expect(scrollTo).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: 'instant' });
    vi.useRealTimers();
  });

  it('soloRuta quita parámetros y ancla', () => {
    expect(soloRuta('/settings?x=1#correos')).toBe('/settings');
  });
});
