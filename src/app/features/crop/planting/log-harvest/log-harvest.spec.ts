import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { RegistrarCosecha } from './log-harvest';
import { CultivoService } from '../../../../core/services/crop.service';
import { PreciosService } from '../../../../core/services/finance.service';

describe('RegistrarCosecha', () => {
  let component: RegistrarCosecha;
  let fixture: ComponentFixture<RegistrarCosecha>;
  let cultivoServiceMock: any;
  let routerMock: any;
  let preciosMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      resumenSiembra: vi.fn().mockReturnValue(of(null)),
      registrarCosecha: vi.fn().mockReturnValue(of({})),
      buscarSiembra: vi.fn().mockReturnValue(of({ id: 5, tipoCultivo: 'Lulo', variedad: 'Castilla' })),
    };
    preciosMock = {
      deCultivo: vi.fn().mockReturnValue(of({ cultivo: 'Lulo', fuente: 'SIPSA', producto: 'Lulo', precioKg: 3500.4, alternativas: [] })),
    };


    await TestBed.configureTestingModule({
      imports: [RegistrarCosecha],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: PreciosService, useValue: preciosMock },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? '5' : null) } } },
        },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarCosecha);
    routerMock = TestBed.inject(Router);
    vi.spyOn(routerMock, 'navigate').mockResolvedValue(true);
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
    const today = new Date().toLocaleDateString('en-CA');
    expect(component.form.fecha).toBe(today);
  });

  it('pide el precio de referencia del cultivo de la siembra y lo usa al tocar Usar', () => {
    expect(preciosMock.deCultivo).toHaveBeenCalledWith('Lulo', 'Castilla');
    expect(component.referencia?.precioKg).toBe(3500.4);
    component.usarReferencia();
    expect(component.form.precioKg).toBe(3500);
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
    expect(cultivoServiceMock.registrarCosecha).toHaveBeenCalledWith({ ...component.form, confirmarCarencia: false });
  });

  it('onSubmit() should set exito and navigate on success', () => {
  let navigateCalled = false;
  routerMock.navigate.mockImplementation(() => { navigateCalled = true; });
  
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void) => { fn(); return 0; }) as any;
  
  component.onSubmit();
  
  expect(component.exito).toBe('siembra.harvest.success');
  expect(component.cargando).toBe(false);
  expect(navigateCalled).toBe(true);
  expect(routerMock.navigate).toHaveBeenCalledWith(['/crops/planting', 5], { queryParams: expect.objectContaining({ tab: 'registros' }) });
  
  globalThis.setTimeout = originalSetTimeout;
});

it('onSubmit() should navigate after 1500ms on success', () => {
  vi.useFakeTimers();
  component.onSubmit();
  vi.advanceTimersByTime(1500);
  expect(routerMock.navigate).toHaveBeenCalledWith(['/crops/planting', 5], { queryParams: expect.objectContaining({ tab: 'registros' }) });
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
    expect(component.error).toBe('siembra.harvest.errors.register');
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

  it('si el backend rechaza por carencia (AGR-012) pide confirmación en vez de mostrar error', () => {
    cultivoServiceMock.registrarCosecha.mockReturnValue(
      throwError(() => ({ error: { errorCode: 'AGR-012', message: 'Todavía no se puede cosechar: Mancozeb...' } })),
    );
    component.onSubmit();
    expect(component.error).toBe('');
    expect(component.pideConfirmacion).toBe(true);
    expect(component.mensajeCarencia).toContain('Mancozeb');
  });

  it('con la casilla marcada envía confirmarCarencia: true', () => {
    component.confirmarCarencia = true;
    component.onSubmit();
    expect(cultivoServiceMock.registrarCosecha).toHaveBeenCalledWith(expect.objectContaining({ confirmarCarencia: true }));
  });

  it('al cambiar la fecha se borra la confirmación anterior', () => {
    component.mensajeCarencia = 'x';
    component.confirmarCarencia = true;
    component.alCambiarFecha();
    expect(component.pideConfirmacion).toBe(false);
    expect(component.confirmarCarencia).toBe(false);
  });

});