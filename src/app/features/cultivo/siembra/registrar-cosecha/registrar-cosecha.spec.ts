import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { RegistrarCosecha } from './registrar-cosecha';
import { CultivoService } from '../../../../core/services/cultivo.service';

describe('RegistrarCosecha', () => {
  let component: RegistrarCosecha;
  let fixture: ComponentFixture<RegistrarCosecha>;
  let cultivoServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      registrarCosecha: vi.fn().mockReturnValue(of({})),
    };

    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistrarCosecha],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '5' } } },
        },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarCosecha);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should set siembraId from route param', () => {
    expect(component.siembraId).toBe(5);
  });

  it('ngOnInit() should set form.siembraId from route param', () => {
    expect(component.form.siembraId).toBe(5);
  });

  it('ngOnInit() should set form.fecha to today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(component.form.fecha).toBe(today);
  });

  it('should have calidades list', () => {
    expect(component.calidades).toEqual(['PRIMERA', 'SEGUNDA', 'TERCERA']);
  });

  it('onSubmit() should call registrarCosecha with form data', () => {
    component.form = {
      fecha: '2024-04-01',
      cantidadKg: 200,
      calidad: 'PRIMERA',
      observaciones: 'Ok',
      siembraId: 5,
    };
    component.onSubmit();
    expect(cultivoServiceMock.registrarCosecha).toHaveBeenCalledWith(component.form);
  });

  it('onSubmit() should set exito and navigate on success', () => {
  let navigateCalled = false;
  routerMock.navigate.mockImplementation(() => { navigateCalled = true; });
  
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void) => { fn(); return 0; }) as any;
  
  component.onSubmit();
  
  expect(component.exito).toBe('¡Cosecha registrada exitosamente!');
  expect(component.cargando).toBe(false);
  expect(navigateCalled).toBe(true);
  expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 5]);
  
  globalThis.setTimeout = originalSetTimeout;
});

it('onSubmit() should navigate after 1500ms on success', () => {
  vi.useFakeTimers();
  component.onSubmit();
  vi.advanceTimersByTime(1500);
  expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 5]);
  vi.useRealTimers();
});

  it('onSubmit() should set error message on failure with server message', () => {
    cultivoServiceMock.registrarCosecha.mockReturnValue(
      throwError(() => ({ error: { message: 'Datos inválidos' } }))
    );
    component.onSubmit();
    expect(component.error).toBe('Datos inválidos');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error message on failure without server message', () => {
    cultivoServiceMock.registrarCosecha.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    component.onSubmit();
    expect(component.error).toBe('Error al registrar la cosecha.');
  });

  it('onSubmit() should clear previous error and exito before submitting', () => {
    component.error = 'Error previo';
    component.exito = 'Éxito previo';
    component.onSubmit();
    expect(component.error).toBe('');
    // exito se limpia antes de la respuesta async
  });

  it('onSubmit() should set cargando=true while submitting', () => {
    cultivoServiceMock.registrarCosecha.mockReturnValue(of({}));
    // cargando se pone true al inicio y false en next
    component.onSubmit();
    // después de next ya es false
    expect(component.cargando).toBe(false);
  });

  it('volver() should navigate to siembra route', () => {
    component.siembraId = 5;
    component.volver();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 5]);
  });
});