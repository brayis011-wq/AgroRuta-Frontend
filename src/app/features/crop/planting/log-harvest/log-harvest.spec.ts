import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { RegistrarCosecha } from './log-harvest';
import { CultivoService } from '../../../../core/services/crop.service';
import { TrabajadorService } from '../../../../core/services/worker.service';

describe('RegistrarCosecha', () => {
  let component: RegistrarCosecha;
  let fixture: ComponentFixture<RegistrarCosecha>;
  let cultivoServiceMock: any;
  let routerMock: any;
  let trabajadoresMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      resumenSiembra: vi.fn().mockReturnValue(of(null)),
      registrarCosecha: vi.fn().mockReturnValue(of({})),
      buscarSiembra: vi.fn().mockReturnValue(of({ id: 5, tipoCultivo: 'Lulo', variedad: 'Castilla' })),
    };
    trabajadoresMock = {
      listar: vi.fn().mockReturnValue(of([
        { id: 1, nombre: 'Leo', apellido: 'Paz', cedula: '1', nombreCompleto: 'Leo Paz', estado: 'ACTIVO',
          cargo: { nombre: 'Recolector', descripcion: '', valorJornal: 0, modalidadPago: 'KILO', valorKilo: 900, activo: true } },
        { id: 2, nombre: 'Eva', apellido: 'Ruiz', cedula: '2', nombreCompleto: 'Eva Ruiz', estado: 'ACTIVO',
          cargo: { nombre: 'Jornalero', descripcion: '', valorJornal: 60000, modalidadPago: 'JORNAL', activo: true } },
        { id: 3, nombre: 'Ana', apellido: 'Gil', cedula: '3', nombreCompleto: 'Ana Gil', estado: 'INACTIVO' },
      ])),
    };


    await TestBed.configureTestingModule({
      imports: [RegistrarCosecha],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: TrabajadorService, useValue: trabajadoresMock },
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

  it('trae solo el equipo activo para anotar quién recogió', () => {
    expect(component.equipo.map((t) => t.id)).toEqual([2, 1]);
  });

  it('cada recolector toma la forma de pago de su cargo y los kilos suman el total', () => {
    component.agregarRecolector();
    component.agregarRecolector();
    const [a, b] = component.recolectores;
    component.elegirTrabajador(a, 1);
    component.elegirTrabajador(b, 2);
    expect(a.modalidad).toBe('KILO');
    expect(a.valorKilo).toBe(900);
    expect(b.modalidad).toBe('DIA');
    expect(b.valorDia).toBe(60000);
    a.kilos = 70;
    component.sumarKilos();
    expect(component.form.cantidadKg).toBe(70);
    expect(component.valorDe(a)).toBe(63000);
    expect(component.manoObra).toBe(123000);
    // Ya elegidos, no se ofrecen en otra fila
    expect(component.disponiblesPara(null)).toEqual([]);
  });

  it('el de día puede anotar los kilos que recogió: suman al total y van con la cosecha', () => {
    component.agregarRecolector();
    component.agregarRecolector();
    const [a, b] = component.recolectores;
    component.elegirTrabajador(a, 1);
    component.elegirTrabajador(b, 2);
    a.kilos = 40;
    b.kilos = 25;
    component.sumarKilos();
    expect(component.form.cantidadKg).toBe(65);
    expect(component.valorDe(b)).toBe(60000);
    component.form = { ...component.form, fecha: '2024-04-01', calidad: 'PRIMERA' };
    component.onSubmit();
    expect(cultivoServiceMock.registrarCosecha).toHaveBeenCalledWith(expect.objectContaining({ recolectores: [
      { trabajadorId: 1, modalidad: 'KILO', kilos: 40, valorKilo: 900, valorDia: null },
      { trabajadorId: 2, modalidad: 'DIA', kilos: 25, valorKilo: null, valorDia: 60000 },
    ] }));
  });

  it('envía los recolectores con la cosecha', () => {
    component.form = { ...component.form, fecha: '2024-04-01', calidad: 'PRIMERA' };
    component.agregarRecolector();
    const fila = component.recolectores[0];
    component.elegirTrabajador(fila, 1);
    fila.kilos = 40;
    component.sumarKilos();
    component.onSubmit();
    expect(cultivoServiceMock.registrarCosecha).toHaveBeenCalledWith(expect.objectContaining({
      cantidadKg: 40,
      recolectores: [{ trabajadorId: 1, modalidad: 'KILO', kilos: 40, valorKilo: 900, valorDia: null }],
    }));
  });

  it('no envía si a un recolector le falta algo o si suman más kilos que la cosecha', () => {
    component.agregarRecolector();
    component.onSubmit();
    expect(component.error).toBe('siembra.harvest.pickers.incomplete');

    const fila = component.recolectores[0];
    component.elegirTrabajador(fila, 1);
    fila.kilos = 90;
    component.form.cantidadKg = 50;
    component.alEscribirTotal();
    component.onSubmit();
    expect(component.error).toBe('siembra.harvest.pickers.tooMany');
    expect(cultivoServiceMock.registrarCosecha).not.toHaveBeenCalled();
    expect(component.totalDistinto).toBe(true);
    component.usarSuma();
    expect(component.form.cantidadKg).toBe(90);
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
    expect(cultivoServiceMock.registrarCosecha).toHaveBeenCalledWith({ ...component.form, confirmarCarencia: false, recolectores: [] });
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