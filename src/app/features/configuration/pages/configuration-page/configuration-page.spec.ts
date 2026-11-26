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
import { SeguridadService } from '../../../../core/services/security.service';
import { AvisosPushService } from '../../../../core/services/push.service';

describe('ConfigurationPageComponent — correos', () => {
  const notificaciones = { obtener: vi.fn(), guardar: vi.fn() };

  function crear(rol = 'Agricultor', fincas: { id: number; nombre: string }[] = []) {
    TestBed.configureTestingModule({
      imports: [ConfigurationPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProfileService,
          useValue: {
            getPerfil: () =>
              of({ id: 1, nombre: 'Ana Pérez', email: 'ana@x.com', rol: 'Agricultor' }),
            olvidarFoto: vi.fn(),
          },
        },
        { provide: NotificacionesService, useValue: notificaciones },
        { provide: AuthService, useValue: { logout: vi.fn(), getUsuario: () => ({ id: 1, rol }) } },
        {
          provide: FincaActivaService,
          useValue: { fincas: signal(fincas), idActiva: signal(null), elegir: vi.fn() },
        },
        { provide: LanguageService, useValue: { current: signal('es'), set: vi.fn() } },
        { provide: TemaService, useValue: { tema: signal('claro'), elegir: vi.fn() } },
        {
          provide: SeguridadService,
          useValue: {
            estado: () => of({ activo: false, codigosRespaldo: 0 }),
            sesiones: () => of([]),
          },
        },
        { provide: AvisosPushService, useValue: { estado: () => Promise.resolve('no-soportado') } },
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
    const switches = f.nativeElement.querySelectorAll(
      '#correos > .pref input[role="switch"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(switches.length).toBe(2);
    expect(switches[0].checked).toBe(true);
    expect(switches[1].checked).toBe(false);
  });

  it('guarda al cambiar un interruptor', () => {
    notificaciones.obtener.mockReturnValue(of({ alertasCultivo: true, avisosTrabajadores: true }));
    notificaciones.guardar.mockImplementation((p) => of(p));
    const c = crear().componentInstance;
    c.cambiarCorreo('alertasCultivo', false);
    expect(notificaciones.guardar).toHaveBeenCalledWith({
      alertasCultivo: false,
      avisosTrabajadores: true,
    });
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

describe('ConfigurationPageComponent — según el rol', () => {
  const notificaciones = {
    obtener: vi.fn(() => of({ alertasCultivo: true, avisosTrabajadores: true })),
    guardar: vi.fn(),
  };
  const fincas = [{ id: 4, nombre: 'El Mirador' }];

  function crear(rol: string) {
    TestBed.configureTestingModule({
      imports: [ConfigurationPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProfileService,
          useValue: {
            getPerfil: () => of({ id: 1, nombre: 'Ana', email: 'ana@x.com', rol }),
            olvidarFoto: vi.fn(),
          },
        },
        { provide: NotificacionesService, useValue: notificaciones },
        { provide: AuthService, useValue: { logout: vi.fn(), getUsuario: () => ({ id: 1, rol }) } },
        // Fincas que quedaron de otra sesión en la misma pestaña: no deben verse en otro rol
        {
          provide: FincaActivaService,
          useValue: { fincas: signal(fincas), idActiva: signal(null), elegir: vi.fn() },
        },
        { provide: LanguageService, useValue: { current: signal('es'), set: vi.fn() } },
        { provide: TemaService, useValue: { tema: signal('claro'), elegir: vi.fn() } },
        {
          provide: SeguridadService,
          useValue: {
            estado: () => of({ activo: false, codigosRespaldo: 0 }),
            sesiones: () => of([]),
          },
        },
        { provide: AvisosPushService, useValue: { estado: () => Promise.resolve('inactivo') } },
      ],
    });
    const f = TestBed.createComponent(ConfigurationPageComponent);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  afterEach(() => vi.clearAllMocks());

  it('el agricultor ve los correos del cultivo, los avisos y la finca al entrar', () => {
    const el = crear('Agricultor');
    expect(el.querySelectorAll('#correos input[role="switch"]').length).toBeGreaterThanOrEqual(2);
    expect(el.querySelector('#correo-cultivo')).not.toBeNull();
    expect(el.querySelector('app-push-toggle')).not.toBeNull();
    expect(el.querySelector('#preferencias select')).not.toBeNull();
  });

  it('el trabajador no ve nada de fincas ni de cultivo; solo sus avisos de pago', () => {
    const el = crear('Trabajador');
    expect(notificaciones.obtener).not.toHaveBeenCalled();
    expect(el.querySelector('#correo-cultivo')).toBeNull();
    expect(el.querySelector('#correo-trabajadores')).toBeNull();
    expect(el.querySelector('#preferencias select')).toBeNull();
    expect(el.querySelector('#correos')?.textContent).toContain('config.mail.workerHint');
    expect(el.querySelector('app-push-toggle')?.textContent).toContain('config.push.hintWorker');
  });

  it('el administrador solo ve la nota de seguridad, sin avisos ni finca', () => {
    const el = crear('Administrador');
    expect(notificaciones.obtener).not.toHaveBeenCalled();
    expect(el.querySelector('#correos input[role="switch"]')).toBeNull();
    expect(el.querySelector('app-push-toggle')).toBeNull();
    expect(el.querySelector('#preferencias select')).toBeNull();
    expect(el.querySelector('#correos .nota')).not.toBeNull();
  });
});
