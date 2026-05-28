// src/app/features/cultivo/siembra/registrar-fumigacion/registrar-fumigacion.spec.ts
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegistrarFumigacion } from './registrar-fumigacion';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AgriculturalInputService } from '../../../../core/services/AgriculturalInput.service';

describe('RegistrarFumigacion', () => {
  let component: RegistrarFumigacion;
  let fixture: ComponentFixture<RegistrarFumigacion>;
  let cultivoServiceMock: any;
  let inputServiceMock: any;
  let router: Router;

  const mockInsumo: any = {
    id: 1, nombre: 'Herbicida X', tipo: 'HERBICIDA',
    unidadSugerida: 'LITROS', dosisSugerida: 2,
    tipoDisplay: 'Herbicida',
  };

  beforeEach(async () => {
    cultivoServiceMock = {
      registrarFumigacion: vi.fn().mockReturnValue(of({})),
    };
    inputServiceMock = {
      search: vi.fn().mockReturnValue(of([mockInsumo])),
      getAll: vi.fn().mockReturnValue(of([mockInsumo])),
    };

    await TestBed.configureTestingModule({
      imports: [RegistrarFumigacion],
      providers: [
        provideRouter([]),
        { provide: CultivoService,           useValue: cultivoServiceMock },
        { provide: AgriculturalInputService, useValue: inputServiceMock   },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue('1') } } },
        },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(RegistrarFumigacion);
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

  it('ngOnInit() should set siembraId and fecha', () => {
    expect(component.siembraId).toBe(1);
    expect(component.form.siembraId).toBe(1);
    expect(component.form.fecha).toBeTruthy();
  });

  // ── seleccionarInsumo ────────────────────────────────────────
  it('seleccionarInsumo() should populate form fields', () => {
    component.seleccionarInsumo(mockInsumo);
    expect(component.form.producto).toBe('Herbicida X');
    expect(component.form.agriculturalInputId).toBe(1);
    expect(component.form.unidadMedida).toBe('LITROS');
    expect(component.form.dosis).toBe(2);
    expect(component.busquedaProducto).toBe('Herbicida X');
    expect(component.mostrarCatalogo()).toBe(false);
  });

  it('seleccionarInsumo() should set insumoSeleccionado signal', () => {
    component.seleccionarInsumo(mockInsumo);
    expect(component.insumoSeleccionado()).toEqual(mockInsumo);
  });

  // ── limpiarInsumo ────────────────────────────────────────────
  it('limpiarInsumo() should clear form fields', () => {
    component.seleccionarInsumo(mockInsumo);
    component.limpiarInsumo();
    expect(component.form.producto).toBe('');
    expect(component.form.agriculturalInputId).toBeUndefined();
    expect(component.form.unidadMedida).toBe('');
    expect(component.form.dosis).toBeUndefined();
    expect(component.busquedaProducto).toBe('');
    expect(component.insumoSeleccionado()).toBeNull();
  });

  // ── usarProductoManual ───────────────────────────────────────
  it('usarProductoManual() should set producto from busqueda when no insumo selected', () => {
    component.busquedaProducto = 'Producto manual';
    component.usarProductoManual();
    expect(component.form.producto).toBe('Producto manual');
    expect(component.form.agriculturalInputId).toBeUndefined();
    expect(component.mostrarCatalogo()).toBe(false);
  });

  it('usarProductoManual() should not override producto when insumo is selected', () => {
    component.seleccionarInsumo(mockInsumo);
    component.busquedaProducto = 'Otro producto';
    component.usarProductoManual();
    expect(component.form.producto).toBe('Herbicida X');
  });

  // ── verCatalogoCompleto ──────────────────────────────────────
  it('verCatalogoCompleto() should toggle off when already showing', () => {
    component.mostrarCatalogoCompleto.set(true);
    component.verCatalogoCompleto();
    expect(component.mostrarCatalogoCompleto()).toBe(false);
  });

  it('verCatalogoCompleto() should load and show catalogo', async () => {
    component.verCatalogoCompleto();
    await fixture.whenStable();
    expect(inputServiceMock.getAll).toHaveBeenCalled();
    expect(component.catalogoCompleto()).toEqual([mockInsumo]);
    expect(component.mostrarCatalogoCompleto()).toBe(true);
  });

  it('verCatalogoCompleto() should not reload if already loaded', () => {
    component.catalogoCompleto.set([mockInsumo]);
    component.verCatalogoCompleto();
    expect(inputServiceMock.getAll).not.toHaveBeenCalled();
    expect(component.mostrarCatalogoCompleto()).toBe(true);
  });

  it('verCatalogoCompleto() should set error on failure', async () => {
    inputServiceMock.getAll.mockReturnValue(throwError(() => new Error()));
    component.verCatalogoCompleto();
    await fixture.whenStable();
    expect(component.error).toBe('Error al cargar el catálogo completo.');
  });

  // ── getCatalogoAgrupado ──────────────────────────────────────
  it('getCatalogoAgrupado() should group items by tipo', () => {
    component.catalogoCompleto.set([mockInsumo]);
    const grupos = component.getCatalogoAgrupado();
    expect(grupos.length).toBe(1);
    expect(grupos[0].tipo).toBe('Herbicida');
    expect(grupos[0].items).toEqual([mockInsumo]);
  });

  it('getCatalogoAgrupado() should filter by filtroCatalogo', () => {
    component.catalogoCompleto.set([mockInsumo]);
    component.filtroCatalogo = 'fungicida';
    const grupos = component.getCatalogoAgrupado();
    expect(grupos.length).toBe(0);
  });

  // ── getTipoBadgeClass ────────────────────────────────────────
  it('getTipoBadgeClass() should return correct class', () => {
    expect(component.getTipoBadgeClass('FUNGICIDA')).toBe('badge-fungicida');
    expect(component.getTipoBadgeClass('HERBICIDA')).toBe('badge-herbicida');
    expect(component.getTipoBadgeClass('INSECTICIDA')).toBe('badge-insecticida');
    expect(component.getTipoBadgeClass('DESCONOCIDO')).toBe('badge-default');
  });

  // ── onSubmit validaciones ────────────────────────────────────
  it('onSubmit() should set error when no producto', () => {
    component.form.producto = '';
    component.onSubmit();
    expect(component.error).toBe('Por favor selecciona o escribe un producto.');
    expect(cultivoServiceMock.registrarFumigacion).not.toHaveBeenCalled();
  });

  it('onSubmit() should set error when no unidadMedida', () => {
    component.form.producto      = 'Herbicida';
    component.form.unidadMedida  = '';
    component.onSubmit();
    expect(component.error).toBe('Por favor selecciona una unidad de medida.');
    expect(cultivoServiceMock.registrarFumigacion).not.toHaveBeenCalled();
  });

  it('onSubmit() should call registrarFumigacion and set exito on success', async () => {
    vi.useFakeTimers();
    component.form.producto     = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.form.dosis        = 2;
    component.form.areaAplicada = 1;
    component.onSubmit();
    await fixture.whenStable();
    expect(cultivoServiceMock.registrarFumigacion).toHaveBeenCalled();
    expect(component.exito).toBe('¡Fumigación registrada exitosamente!');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should navigate after 1500ms on success', async () => {
    vi.useFakeTimers();
    vi.spyOn(router, 'navigate');
    component.form.producto     = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.onSubmit();
    vi.advanceTimersByTime(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 1]);
  });

  it('onSubmit() should set error on failure', async () => {
    cultivoServiceMock.registrarFumigacion.mockReturnValue(
      throwError(() => ({ error: { message: 'Error del servidor' } }))
    );
    component.form.producto     = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error).toBe('Error del servidor');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error when no message', async () => {
    cultivoServiceMock.registrarFumigacion.mockReturnValue(
      throwError(() => ({}))
    );
    component.form.producto     = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error).toBe('Error al registrar la fumigación.');
  });

  // ── volver ───────────────────────────────────────────────────
  it('volver() should navigate to siembra', () => {
    vi.spyOn(router, 'navigate');
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 1]);
  });
});
