// src/app/features/auth/registro/registro.spec.ts
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegistroComponent } from './registro';
import { AuthService } from '../../../core/services/auth';

describe('RegistroComponent', () => {
  let component: RegistroComponent;
  let fixture: ComponentFixture<RegistroComponent>;
  let authServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      registro: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegistroComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(RegistroComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.form.nombre).toBe('');
    expect(component.form.email).toBe('');
    expect(component.form.password).toBe('');
    expect(component.form.rol).toBe('Agricultor');
    expect(component.error).toBe('');
    expect(component.exito).toBe('');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should clear error and exito before each attempt', () => {
    authServiceMock.registro.mockReturnValue(of({} as any));
    component.error = 'Error previo';
    component.exito = 'Exito previo';
    component.onSubmit();
    expect(component.error).toBe('');
  });

  it('onSubmit() should call authService.registro with form data', () => {
    authServiceMock.registro.mockReturnValue(of({} as any));
    component.form = { nombre: 'Juan', email: 'juan@test.com', password: '123456', rol: 'Agricultor' };
    component.onSubmit();
    expect(authServiceMock.registro).toHaveBeenCalledWith({
      nombre:   'Juan',
      email:    'juan@test.com',
      password: '123456',
      rol:      'Agricultor',
    });
  });

  it('onSubmit() should set exito message and cargando=false on success', () => {
    authServiceMock.registro.mockReturnValue(of({} as any));
    component.onSubmit();
    expect(component.exito).toBe('¡Usuario registrado exitosamente! Redirigiendo...');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should navigate to /auth/login after 2000ms on success', async () => {
    vi.useFakeTimers();
    vi.spyOn(router, 'navigate');
    authServiceMock.registro.mockReturnValue(of({} as any));
    component.onSubmit();
    vi.advanceTimersByTime(2000);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('onSubmit() should NOT navigate before 2000ms', async () => {
    vi.useFakeTimers();
    vi.spyOn(router, 'navigate');
    authServiceMock.registro.mockReturnValue(of({} as any));
    component.onSubmit();
    vi.advanceTimersByTime(1999);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('onSubmit() should set error from err.error.message on failure', () => {
    authServiceMock.registro.mockReturnValue(
      throwError(() => ({ error: { message: 'El correo ya existe.' } }))
    );
    component.onSubmit();
    expect(component.error).toBe('El correo ya existe.');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error when err.error.message is missing', () => {
    authServiceMock.registro.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    component.onSubmit();
    expect(component.error).toBe('Error al registrar usuario.');
  });

  it('onSubmit() should set generic error when err.error is null', () => {
    authServiceMock.registro.mockReturnValue(
      throwError(() => ({}))
    );
    component.onSubmit();
    expect(component.error).toBe('Error al registrar usuario.');
  });
});
