import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RestablecerComponent } from './restablecer';
import { AuthService } from '../../../core/services/auth';

describe('RestablecerComponent', () => {
  const auth = { restablecer: vi.fn() };

  function crear(token: string | null) {
    TestBed.configureTestingModule({
      imports: [RestablecerComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } },
      ],
    });
    const f = TestBed.createComponent(RestablecerComponent);
    f.detectChanges();
    return f;
  }

  afterEach(() => vi.clearAllMocks());

  it('sin token muestra que el enlace no sirve', () => {
    const f = crear(null);
    expect(f.componentInstance.enlaceMalo()).toBe(true);
    expect(f.nativeElement.querySelector('a[href="/auth/recuperar"]')).not.toBeNull();
  });

  it('valida largo y que las dos contraseñas coincidan', () => {
    const c = crear('tok').componentInstance;
    c.password.set('corta');
    expect(c.problema()).toBe('auth.reset.length');
    expect(c.listo()).toBe(false);
    c.password.set('una-clave-larga');
    c.confirmar.set('otra-clave-larga');
    expect(c.problema()).toBe('auth.reset.mismatch');
    c.confirmar.set('una-clave-larga');
    expect(c.problema()).toBe('');
    expect(c.listo()).toBe(true);
  });

  it('guarda y vuelve al login con el aviso de contraseña nueva', () => {
    auth.restablecer.mockReturnValue(of({ mensaje: 'ok' }));
    const c = crear('tok').componentInstance;
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    c.password.set('una-clave-larga');
    c.confirmar.set('una-clave-larga');
    c.guardar();
    expect(auth.restablecer).toHaveBeenCalledWith('tok', 'una-clave-larga');
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], { queryParams: { clave: 'nueva' } });
  });

  it('enlace vencido (422) ofrece pedir otro; otros errores se muestran', () => {
    const c = crear('tok').componentInstance;
    c.password.set('una-clave-larga');
    c.confirmar.set('una-clave-larga');
    auth.restablecer.mockReturnValue(throwError(() => ({ status: 500 })));
    c.guardar();
    expect(c.error()).toBe('auth.login.serverError');
    auth.restablecer.mockReturnValue(throwError(() => ({ status: 422 })));
    c.guardar();
    expect(c.enlaceMalo()).toBe(true);
  });

  it('no envía si el formulario no está listo', () => {
    const c = crear('tok').componentInstance;
    c.guardar();
    expect(auth.restablecer).not.toHaveBeenCalled();
  });
});
