import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { VerificarComponent } from './verificar';
import { AuthService } from '../../../core/services/auth';

describe('VerificarComponent', () => {
  const auth = { verificar: vi.fn(), reenviarVerificacion: vi.fn() };

  function crear(token: string | null) {
    TestBed.configureTestingModule({
      imports: [VerificarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } },
      ],
    });
    const f = TestBed.createComponent(VerificarComponent);
    return f;
  }

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('confirma el correo y entra a su inicio según el rol', () => {
    vi.useFakeTimers();
    auth.verificar.mockReturnValue(of({ id: 1, token: 't', email: 'a@x.com', nombre: 'Ana', rol: 'Trabajador' }));
    const f = crear('tok');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    f.detectChanges();
    expect(auth.verificar).toHaveBeenCalledWith('tok');
    expect(f.componentInstance.estado()).toBe('listo');
    vi.advanceTimersByTime(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/portal']);
  });

  it('sin token o con enlace vencido ofrece reenviar', () => {
    const f = crear(null);
    f.detectChanges();
    expect(f.componentInstance.estado()).toBe('malo');
    expect(auth.verificar).not.toHaveBeenCalled();

    auth.reenviarVerificacion.mockReturnValue(of({ mensaje: 'ok' }));
    const c = f.componentInstance;
    c.email = ' ana@x.com ';
    c.reenviar();
    expect(auth.reenviarVerificacion).toHaveBeenCalledWith('ana@x.com');
    expect(c.reenviado()).toBe(true);
  });

  it('422 = enlace malo; otro error = servidor', () => {
    auth.verificar.mockReturnValue(throwError(() => ({ status: 422 })));
    const f = crear('viejo');
    f.detectChanges();
    expect(f.componentInstance.estado()).toBe('malo');
  });

  it('servidor caído muestra el error', () => {
    auth.verificar.mockReturnValue(throwError(() => ({ status: 0 })));
    const f = crear('tok');
    f.detectChanges();
    expect(f.componentInstance.estado()).toBe('error');
  });
});
