import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../../core/services/auth';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty fields', () => {
    expect(component.form.email).toBe('');
    expect(component.form.password).toBe('');
    expect(component.error).toBe('');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should navigate to /dashboard on success', () => {
    authServiceMock.login.mockReturnValue(of({} as any));
    component.form = { email: 'test@test.com', password: '123456' };
    component.onSubmit();
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: '123456',
    });
    expect(component.cargando).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('onSubmit() should set cargando=false after success', () => {
    authServiceMock.login.mockReturnValue(of({} as any));
    component.onSubmit();
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should clear error before each attempt', () => {
    authServiceMock.login.mockReturnValue(of({} as any));
    component.error = 'Error previo';
    component.onSubmit();
    expect(component.error).toBe('');
  });

  it('onSubmit() should set error message on 401', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 401 })));
    component.onSubmit();
    expect(component.error).toBe('Correo o contraseña incorrectos.');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set error message on 403', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 403 })));
    component.onSubmit();
    expect(component.error).toBe('Correo o contraseña incorrectos.');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error on other status codes', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 500 })));
    component.onSubmit();
    expect(component.error).toBe('Error al conectar con el servidor.');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error on network failure', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 0 })));
    component.onSubmit();
    expect(component.error).toBe('Error al conectar con el servidor.');
  });
});
