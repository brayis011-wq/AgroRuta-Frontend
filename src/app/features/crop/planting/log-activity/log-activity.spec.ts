import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { RegistrarActividad } from './log-activity';
import { CultivoService } from '../../../../core/services/crop.service';

describe('RegistrarActividad', () => {
  let component: RegistrarActividad;
  let fixture: ComponentFixture<RegistrarActividad>;
  let cultivoServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      registrarActividad: vi.fn().mockReturnValue(of({})),
    };


    await TestBed.configureTestingModule({
      imports: [RegistrarActividad],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? '7' : null) } } },
        },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarActividad);
    routerMock = TestBed.inject(Router);
    vi.spyOn(routerMock, 'navigate').mockResolvedValue(true);
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
    const today = new Date().toLocaleDateString('en-CA');
    expect(component.form.fecha).toBe(today);
  });

  it('should have correct tiposActividad list', () => {
    expect(component.tiposActividad).toEqual([
      'ABONADO', 'PODA', 'TUTOREO', 'DESHIERBE', 'RIEGO', 'REVISION', 'OTRO'
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
    expect(cultivoServiceMock.registrarActividad).toHaveBeenCalledWith(
      { ...component.form, producto: null, agriculturalInputId: null, cantidadUsada: null, unidadCantidad: null });
  });

  it('el abonado abre el insumo y manda el producto de la bodega con su cantidad', () => {
    component.bodega = [{ insumoId: 9, nombre: 'Abono 15-15-15', tipo: 'FERTILIZANTE_SUELO', unidadBase: 'GRAMOS', cantidad: 100000,
      stockMinimo: null, costoPromedio: 3, valorStock: 300000, estado: 'OK', ultimoMovimiento: null } as any];
    component.form = { ...component.form, descripcion: '', fecha: '2024-04-01', siembraId: 7 };
    component.elegirTipo('ABONADO');
    expect(component.conInsumo).toBe(true);
    component.elegirInsumo(9);
    expect(component.form.unidadCantidad).toBe('KG');
    expect(component.unidades).toEqual(['KG', 'GRAMOS']);
    component.form.cantidadUsada = 50;
    component.onSubmit();
    expect(cultivoServiceMock.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'ABONADO', producto: 'Abono 15-15-15', agriculturalInputId: 9, cantidadUsada: 50, unidadCantidad: 'KG' }));
  });
  it('onSubmit() should set exito and navigate on success', () => {
    const orig = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: any) => { fn(); return 0; }) as any;
    component.onSubmit();
    expect(component.exito).toBeTruthy();
    expect(component.cargando).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/crops/planting', 7], { queryParams: expect.objectContaining({ tab: 'registros' }) });
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
    expect(component.error).toBe('siembra.activity.errors.register');
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

});
