import { vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfigurationPageComponent } from './configuration-page';
import { ProfileService } from '../../../../core/services/profile.service';
import { NotificacionesService } from '../../../../core/services/notifications.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FincaActivaService } from '../../../../core/services/active-farm.service';
import { LanguageService } from '../../../../core/services/language.service';
import { TemaService } from '../../../../core/services/theme.service';

describe('ConfigurationPageComponent — correos', () => {
  const notificaciones = { obtener: vi.fn(), guardar: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [ConfigurationPageComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: { getPerfil: () => of({ id: 1, nombre: 'Ana Pérez', email: 'ana@x.com', rol: 'Agricultor' }), olvidarFoto: vi.fn() } },
        { provide: NotificacionesService, useValue: notificaciones },
        { provide: AuthService, useValue: { logout: vi.fn() } },
        { provide: FincaActivaService, useValue: { fincas: signal([]), idActiva: signal(null), elegir: vi.fn() } },
        { provide: LanguageService, useValue: { current: signal('es'), set: vi.fn() } },
        { provide: TemaService, useValue: { tema: signal('claro'), elegir: vi.fn() } },
      ],
    });
    const f = TestBed.createComponent(ConfigurationPageComponent);
    f.detectChanges();
    return f;
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('carga las preferencias y muestra los dos interruptores', () => {
    notificaciones.obtener.mockReturnValue(of({ alertasCultivo: true, avisosTrabajadores: false }));
    const f = crear();
    const switches = f.nativeElement.querySelectorAll('#correos input[role="switch"]') as NodeListOf<HTMLInputElement>;
    expect(switches.length).toBe(2);
    expect(switches[0].checked).toBe(true);
    expect(switches[1].checked).toBe(false);
  });

  it('guarda al cambiar un interruptor', () => {
    notificaciones.obtener.mockReturnValue(of({ alertasCultivo: true, avisosTrabajadores: true }));
    notificaciones.guardar.mockImplementation((p) => of(p));
    const c = crear().componentInstance;
    c.cambiarCorreo('alertasCultivo', false);
    expect(notificaciones.guardar).toHaveBeenCalledWith({ alertasCultivo: false, avisosTrabajadores: true });
    expect(c.correos()).toEqual({ alertasCultivo: false, avisosTrabajadores: true });
    expect(c.guardandoCorreos()).toBe(false);
  });

  it('si no se puede guardar, vuelve a como estaba', () => {
    notificaciones.obtener.mockReturnValue(of({ alertasCultivo: true, avisosTrabajadores: true }));
    notificaciones.guardar.mockReturnValue(throwError(() => ({ status: 500 })));
    const c = crear().componentInstance;
    c.cambiarCorreo('avisosTrabajadores', false);
    expect(c.correos()).toEqual({ alertasCultivo: true, avisosTrabajadores: true });
    expect(c.toast?.type).toBe('error');
  });

  it('sin preferencias cargadas no intenta guardar', () => {
    notificaciones.obtener.mockReturnValue(throwError(() => ({ status: 0 })));
    const c = crear().componentInstance;
    c.cambiarCorreo('alertasCultivo', false);
    expect(notificaciones.guardar).not.toHaveBeenCalled();
  });
});
