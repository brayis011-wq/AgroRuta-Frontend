import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RecuperarComponent } from './forgot-password';
import { AuthService } from '../../../core/services/auth.service';

describe('RecuperarComponent', () => {
  const auth = { recuperar: vi.fn() };

  function crear(email: string | null = null) {
    TestBed.configureTestingModule({
      imports: [RecuperarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(email ? { email } : {}) } } },
      ],
    });
    const f = TestBed.createComponent(RecuperarComponent);
    f.detectChanges();
    return f;
  }

  afterEach(() => vi.clearAllMocks());

  it('toma el correo que venía del login', () => {
    expect(crear('ana@x.com').componentInstance.email).toBe('ana@x.com');
  });

  it('envía el correo sin espacios y muestra la confirmación', () => {
    auth.recuperar.mockReturnValue(of({ mensaje: 'ok' }));
    const f = crear();
    const c = f.componentInstance;
    c.email = '  ana@x.com ';
    c.enviar();
    f.detectChanges();
    expect(auth.recuperar).toHaveBeenCalledWith('ana@x.com');
    expect(c.enviado()).toBe(true);
    expect(f.nativeElement.querySelector('.hecho')).not.toBeNull();
    c.otraVez();
    expect(c.enviado()).toBe(false);
  });

  it('sin correo no llama al servidor', () => {
    const c = crear().componentInstance;
    c.email = '   ';
    c.enviar();
    expect(auth.recuperar).not.toHaveBeenCalled();
  });

  it('correo inválido (400) o servidor caído muestran el error', () => {
    const c = crear().componentInstance;
    c.email = 'malo';
    auth.recuperar.mockReturnValue(throwError(() => ({ status: 400 })));
    c.enviar();
    expect(c.error()).toBe('auth.forgot.invalidEmail');
    auth.recuperar.mockReturnValue(throwError(() => ({ status: 0 })));
    c.enviar();
    expect(c.error()).toBe('auth.login.serverError');
    expect(c.enviado()).toBe(false);
  });
});
