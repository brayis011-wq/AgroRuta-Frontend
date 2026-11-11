import { vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OpenSessionsComponent } from './open-sessions';
import { SeguridadService, SesionAbierta } from '../../../core/services/security.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

describe('OpenSessionsComponent', () => {
  const seguridad = { sesiones: vi.fn(), cerrarSesion: vi.fn(), cerrarOtras: vi.fn() };
  const auth = { olvidarSesion: vi.fn() };
  const router = { navigate: vi.fn() };

  const otra: SesionAbierta = { id: 7, dispositivo: 'Chrome · Android', iniciadaEn: '2026-11-01T10:00:00Z', ultimoUso: '2026-11-09T08:00:00Z', actual: false };
  const esta: SesionAbierta = { id: 9, dispositivo: 'Firefox · Windows', iniciadaEn: '2026-11-08T10:00:00Z', ultimoUso: '2026-11-08T12:00:00Z', actual: true };

  function crear() {
    TestBed.configureTestingModule({
      imports: [OpenSessionsComponent],
      providers: [
        { provide: SeguridadService, useValue: seguridad },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: LanguageService, useValue: { current: signal('es') } },
      ],
    });
    const f = TestBed.createComponent(OpenSessionsComponent);
    f.detectChanges();
    return f;
  }

  afterEach(() => vi.clearAllMocks());

  it('lista las sesiones con la de este navegador primero', () => {
    seguridad.sesiones.mockReturnValue(of([otra, esta]));
    const f = crear();
    const filas = f.nativeElement.querySelectorAll('.sesiones li');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Firefox · Windows');
    expect(filas[0].querySelector('.esta-chip')).toBeTruthy();
    expect(filas[1].querySelector('.ti-device-mobile')).toBeTruthy();
    expect(f.componentInstance.hayOtras).toBe(true);
  });

  it('cerrar otra sesión la quita de la lista', () => {
    seguridad.sesiones.mockReturnValue(of([otra, esta]));
    seguridad.cerrarSesion.mockReturnValue(of(undefined));
    const c = crear().componentInstance;
    c.cerrar(otra);
    expect(seguridad.cerrarSesion).toHaveBeenCalledWith(7);
    expect(c.sesiones()).toEqual([esta]);
    expect(auth.olvidarSesion).not.toHaveBeenCalled();
  });

  it('cerrar la sesión de este navegador lleva al login', () => {
    seguridad.sesiones.mockReturnValue(of([esta]));
    seguridad.cerrarSesion.mockReturnValue(of(undefined));
    const c = crear().componentInstance;
    c.cerrar(esta);
    expect(auth.olvidarSesion).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('cerrar las demás deja solo esta', () => {
    seguridad.sesiones.mockReturnValue(of([otra, esta]));
    seguridad.cerrarOtras.mockReturnValue(of({ cerradas: 1 }));
    const c = crear().componentInstance;
    c.cerrarOtras();
    expect(c.sesiones()).toEqual([esta]);
    expect(c.hayOtras).toBe(false);
  });

  it('si falla el cierre, conserva la lista y avisa', () => {
    seguridad.sesiones.mockReturnValue(of([otra, esta]));
    seguridad.cerrarSesion.mockReturnValue(throwError(() => ({ status: 500 })));
    const c = crear().componentInstance;
    c.cerrar(otra);
    expect(c.sesiones()?.length).toBe(2);
    expect(c.error()).toBe(true);
    expect(c.cerrando()).toBeNull();
  });
});
