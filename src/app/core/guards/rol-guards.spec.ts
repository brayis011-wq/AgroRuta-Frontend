import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { areaAgricultorGuard, inicioPorRol, trabajadorGuard } from './rol-guards';
import { AuthService } from '../services/auth';

describe('rol guards', () => {
  let authMock: { getUsuario: ReturnType<typeof vi.fn> };

  const ejecutar = (guard: any) => TestBed.runInInjectionContext(() => guard({} as any, {} as any));
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  beforeEach(() => {
    authMock = { getUsuario: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authMock }],
    });
  });

  it('inicioPorRol sends each role to its area', () => {
    expect(inicioPorRol('Administrador')).toBe('/admin');
    expect(inicioPorRol('Trabajador')).toBe('/portal');
    expect(inicioPorRol('Agricultor')).toBe('/dashboard');
  });

  it('areaAgricultorGuard lets a farmer through', () => {
    authMock.getUsuario.mockReturnValue({ rol: 'Agricultor' });
    expect(ejecutar(areaAgricultorGuard)).toBe(true);
  });

  it('areaAgricultorGuard sends the admin to /admin and the worker to /portal', () => {
    authMock.getUsuario.mockReturnValue({ rol: 'Administrador' });
    expect(url(ejecutar(areaAgricultorGuard))).toBe('/admin');
    authMock.getUsuario.mockReturnValue({ rol: 'Trabajador' });
    expect(url(ejecutar(areaAgricultorGuard))).toBe('/portal');
  });

  it('trabajadorGuard only lets workers in', () => {
    authMock.getUsuario.mockReturnValue({ rol: 'Trabajador' });
    expect(ejecutar(trabajadorGuard)).toBe(true);
    authMock.getUsuario.mockReturnValue({ rol: 'Agricultor' });
    expect(url(ejecutar(trabajadorGuard))).toBe('/dashboard');
  });
});
