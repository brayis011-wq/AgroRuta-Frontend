import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { RegistrarActividad } from './registrar-actividad';
import { CultivoService } from '../../../../core/services/cultivo.service';

describe('RegistrarActividad', () => {
  let component: RegistrarActividad;
  let fixture: ComponentFixture<RegistrarActividad>;
  let cultivoServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      registrarActividad: vi.fn().mockReturnValue(of({})),
    };

    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistrarActividad],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '7' } } },
        },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarActividad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should set siembraId from route param', () => {
    expect(component.siembraId).toBe(7);
  });

  it('ngOnInit() should set form.siembraId from route param', () => {
    expect(component.form.siembraId).toBe(7);
  });

  it('ngOnInit() should set form.fecha to today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(component.form.fecha).toBe(today);
  });

  it('should have correct tiposActividad list', () => {
    expect(component.tiposActividad).toEqual([
      'PODA', 'TUTOREO', 'DESHIERBE', 'RIEGO', 'REVISION', 'OTRO'
    ]);
  });

  it('should have tipoIconos map with all types', () => {
    expect(component.tipoIconos['PODA']).toBeDefined();
    expect(component.tipoIconos['TUTOREO']).toBeDefined();
    expect(component.tipoIconos['DESHIERBE']).toBeDefined();
    expect(component.tipoIconos['RIEGO']).toBeDefined();
    expect(component.tipoIconos['REVISION']).toBeDefined();
    expect(component.tipoIconos['OTRO']).toBeDefined();
  });

  it('onSubmit() should call registrarActividad with form data', () => {
    component.form = {
      tipo: 'RIEGO',
      descripcion: 'Riego manual',
      fecha: '2024-04-01',
      siembraId: 7,
    };
    component.onSubmit();
    expect(cultivoServiceMock.registrarActividad).toHaveBeenCalledWith(component.form);
  });
  it('onSubmit() should set exito and navigate on success', () => {
    const orig = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: any) => { fn(); return 0; }) as any;
    component.onSubmit();
    expect(component.exito).toBeTruthy();
    expect(component.cargando).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 7]);
    globalThis.setTimeout = orig;
  });

  it('onSubmit() should set error message on failure with server message', () => {
    cultivoServiceMock.registrarActividad.mockReturnValue(
      throwError(() => ({ error: { message: 'Tipo inválido' } }))
    );
    component.onSubmit();
    expect(component.error).toBe('Tipo inválido');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error message on failure without server message', () => {
    cultivoServiceMock.registrarActividad.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    component.onSubmit();
    expect(component.error).toBe('Error al registrar la actividad.');
  });

  it('onSubmit() should clear previous error and exito before submitting', () => {
    component.error = 'Error previo';
    component.exito = 'Éxito previo';
    component.onSubmit();
    // Se limpian al inicio del método
    expect(component.error).toBe('');
  });

  it('onSubmit() should set cargando=false after success response', () => {
    component.onSubmit();
    expect(component.cargando).toBe(false);
  });

  it('volver() should navigate to siembra route', () => {
    component.siembraId = 7;
    component.volver();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 7]);
  });
});
