import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { redirectAdminGuard } from './redirect-admin-guard';
import { AuthService } from '../services/auth';

describe('redirectAdminGuard', () => {
  let authMock: { getUsuario: ReturnType<typeof vi.fn> };

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => redirectAdminGuard({} as any, {} as any));

  beforeEach(() => {
    authMock = { getUsuario: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authMock }],
    });
  });

  it('should send the admin to /admin', () => {
    authMock.getUsuario.mockReturnValue({ rol: 'Administrador' });
    const resultado = ejecutar() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/admin');
  });

  it('should let a farmer through', () => {
    authMock.getUsuario.mockReturnValue({ rol: 'Agricultor' });
    expect(ejecutar()).toBe(true);
  });
});
