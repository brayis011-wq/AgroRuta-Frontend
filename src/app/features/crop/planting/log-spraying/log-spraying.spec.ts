// src/app/features/crop/planting/log-spraying/log-spraying.spec.ts
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegistrarFumigacion } from './log-spraying';
import { CultivoService } from '../../../../core/services/crop.service';
import { AgriculturalInputService } from '../../../../core/services/agricultural-input.service';
import { InventarioService } from '../../../../core/services/inventory.service';

describe('RegistrarFumigacion', () => {
  let component: RegistrarFumigacion;
  let fixture: ComponentFixture<RegistrarFumigacion>;
  let cultivoServiceMock: any;
  let inputServiceMock: any;
  let inventarioMock: any;
  let router: Router;

  const mockInsumo: any = {
    id: 1,
    nombre: 'Herbicida X',
    tipo: 'HERBICIDA',
    unidadSugerida: 'LITROS',
    dosisSugerida: 2,
    tipoDisplay: 'Herbicida',
    reentradaHoras: 12,
    diasCarencia: 7,
  };
  /** En el catálogo, pero sin compras: no está en la bodega */
  const fueraDeBodega: any = {
    id: 2,
    nombre: 'Mancozeb',
    tipo: 'FUNGICIDA',
    unidadSugerida: 'KG',
    dosisSugerida: 1,
    tipoDisplay: 'Fungicida',
    reentradaHoras: 24,
  };
  const stockHerbicida: any = {
    insumoId: 1,
    nombre: 'Herbicida X',
    tipo: 'HERBICIDA',
    unidadBase: 'ML',
    cantidad: 2500,
    stockMinimo: null,
    costoPromedio: 40,
    valorStock: 100000,
    estado: 'OK',
    ultimoMovimiento: null,
  };
  /** En la bodega, pero su ficha ya no está en el catálogo activo */
  const stockSinFicha: any = {
    insumoId: 9,
    nombre: 'Abono viejo',
    tipo: null,
    unidadBase: 'GRAMOS',
    cantidad: 0,
    stockMinimo: null,
    costoPromedio: null,
    valorStock: null,
    estado: 'AGOTADO',
    ultimoMovimiento: null,
  };

  beforeEach(async () => {
    cultivoServiceMock = {
      registrarFumigacion: vi.fn().mockReturnValue(of({})),
      buscarSiembra: vi.fn().mockReturnValue(of({ id: 1, loteId: 3 })),
      buscarLote: vi.fn().mockReturnValue(of({ id: 3, nombre: 'Lote 3', area: 2.5 })),
    };
    inputServiceMock = {
      search: vi.fn().mockReturnValue(of([mockInsumo, fueraDeBodega])),
      getAll: vi.fn().mockReturnValue(of([mockInsumo, fueraDeBodega])),
    };
    inventarioMock = {
      stock: vi.fn().mockReturnValue(of([stockSinFicha, stockHerbicida])),
      costoEstimado: vi.fn().mockReturnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [RegistrarFumigacion],
      providers: [
        provideRouter([]),
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: AgriculturalInputService, useValue: inputServiceMock },
        { provide: InventarioService, useValue: inventarioMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: vi.fn((k: string) => (k === 'id' ? '1' : null)) } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarFumigacion);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    // Al guardar se navega enseguida y aquí no hay rutas: se observa la llamada sin navegar de verdad
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
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

  it('una fumigación nueva empieza con el área del lote', () => {
    expect(cultivoServiceMock.buscarLote).toHaveBeenCalledWith(3);
    expect(component.form.areaAplicada).toBe(2.5);
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

  // ── Solo insumos de la bodega ────────────────────────────────
  it('loads only the inputs recorded in the warehouse, not the whole catalog', () => {
    expect(inventarioMock.stock).toHaveBeenCalledTimes(1);
    expect(component.cargandoBodega()).toBe(false);
    expect(component.bodega().map((b) => b.stock.nombre)).toEqual(['Abono viejo', 'Herbicida X']);
    expect(component.bodega().some((b) => b.stock.nombre === 'Mancozeb')).toBe(false);
    // La ficha del catálogo acompaña al producto de la bodega (dosis sugerida, reentrada)
    expect(component.bodega()[1].insumo).toEqual(mockInsumo);
    expect(component.bodega()[0].insumo).toBeNull();
  });

  it('searches inside the warehouse without asking the catalog', () => {
    component.busquedaProducto = 'herbi';
    component.onBusquedaChange();
    expect(component.catalogoFiltrado().map((b) => b.stock.insumoId)).toEqual([1]);
    expect(component.mostrarCatalogo()).toBe(true);
    expect(inputServiceMock.search).not.toHaveBeenCalled();
  });

  it('does not offer a catalog product that is not in the warehouse', () => {
    component.busquedaProducto = 'mancozeb';
    component.onBusquedaChange();
    expect(component.catalogoFiltrado()).toEqual([]);
    // La lista se abre igual, para avisar que no está en la bodega
    expect(component.mostrarCatalogo()).toBe(true);
  });

  it('ignores accents and capitals when searching', () => {
    component.busquedaProducto = 'ÁBONO';
    component.onBusquedaChange();
    expect(component.catalogoFiltrado().map((b) => b.stock.insumoId)).toEqual([9]);
  });

  it('shows the whole warehouse when the field is touched or emptied', () => {
    component.busquedaProducto = 'herbi';
    component.onBusquedaChange();
    component.busquedaProducto = '  ';
    component.onBusquedaChange();
    expect(component.mostrarCatalogo()).toBe(true);
    expect(component.catalogoFiltrado().map((b) => b.stock.insumoId)).toEqual([9, 1]);
  });

  it('does not open an empty list when the warehouse is empty and nothing is typed', () => {
    component.bodega.set([]);
    component.busquedaProducto = '';
    component.onBusquedaChange();
    expect(component.mostrarCatalogo()).toBe(false);
  });

  it('moves with the arrow keys and picks the marked product with Enter', () => {
    component.busquedaProducto = '';
    component.onBusquedaChange();
    const tecla = (key: string) => {
      const e = new KeyboardEvent('keydown', { key, cancelable: true });
      component.teclaBuscador(e);
      return e;
    };
    tecla('ArrowDown');
    expect(component.resaltado()).toBe(1);
    const enter = tecla('Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(component.form.agriculturalInputId).toBe(1);
    expect(component.insumoSeleccionado()?.id).toBe(1);
  });

  it('Escape closes only the list, not the panel', () => {
    component.busquedaProducto = '';
    component.onBusquedaChange();
    const e = new KeyboardEvent('keydown', { key: 'Escape' });
    const parar = vi.spyOn(e, 'stopPropagation');
    component.teclaBuscador(e);
    expect(component.mostrarCatalogo()).toBe(false);
    expect(parar).toHaveBeenCalled();
  });

  it('seleccionarDeBodega() fills the form with the catalog sheet of the product', () => {
    component.mostrarBodega.set(true);
    component.seleccionarDeBodega(component.bodega()[1]);
    expect(component.form.agriculturalInputId).toBe(1);
    expect(component.form.dosis).toBe(2);
    expect(component.form.reentradaHoras).toBe(12);
    expect(component.form.diasCarencia).toBe(7);
    expect(component.form.unidadCantidad).toBe('LITROS');
    expect(component.mostrarBodega()).toBe(false);
  });

  it('seleccionarDeBodega() works for a product whose catalog sheet is gone', () => {
    component.seleccionarDeBodega(component.bodega()[0]);
    expect(component.form.agriculturalInputId).toBe(9);
    expect(component.form.producto).toBe('Abono viejo');
    expect(component.form.unidadMedida).toBe('KG');
    expect(component.form.dosis).toBeUndefined();
    expect(component.form.reentradaHoras).toBeNull();
  });

  // ── Una sola unidad para la dosis y la cantidad ──────────────
  it('offers every unit without a product, and only those of its kind with one', () => {
    expect(component.unidadesDisponibles()).toEqual(['LITROS', 'ML', 'GRAMOS', 'KG']);
    component.seleccionarDeBodega(component.bodega()[1]); // líquido
    expect(component.unidadesDisponibles()).toEqual(['LITROS', 'ML']);
    component.seleccionarDeBodega(component.bodega()[0]); // sólido
    expect(component.unidadesDisponibles()).toEqual(['KG', 'GRAMOS']);
  });

  it('the total amount always uses the unit of the dose', () => {
    component.seleccionarDeBodega(component.bodega()[1]);
    expect(component.form.unidadCantidad).toBe(component.form.unidadMedida);
    component.form.unidadMedida = 'ML';
    component.cambiarUnidad();
    expect(component.form.unidadCantidad).toBe('ML');
  });

  it('sends the same unit for the dose and the total amount', () => {
    component.seleccionarDeBodega(component.bodega()[1]);
    component.form.unidadMedida = 'ML';
    component.cambiarUnidad();
    component.form.dosis = 150;
    component.form.cantidadUsada = 900;
    component.onSubmit();
    expect(cultivoServiceMock.registrarFumigacion).toHaveBeenCalledWith(
      expect.objectContaining({ unidadMedida: 'ML', cantidadUsada: 900, unidadCantidad: 'ML' }),
    );
  });

  it('shows the unit inside the total amount field instead of a second selector', () => {
    component.seleccionarDeBodega(component.bodega()[1]);
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('select#unidadCantidad').length).toBe(0);
    expect(el.querySelector('.sufijo-unidad')?.textContent?.trim()).toBeTruthy();
  });

  describe('editing a spraying saved before the units were unified', () => {
    function editar(guardada: any) {
      const route = TestBed.inject(ActivatedRoute) as any;
      route.snapshot.paramMap.get.mockImplementation((k: string) =>
        k === 'id' ? '1' : k === 'registroId' ? '5' : null,
      );
      cultivoServiceMock.buscarFumigacion = vi.fn().mockReturnValue(
        of({
          fecha: '2026-11-10',
          producto: 'Herbicida X',
          agriculturalInputId: 1,
          areaAplicada: 1,
          ...guardada,
        }),
      );
      inputServiceMock.getById = vi.fn().mockReturnValue(of(mockInsumo));
      const otro = TestBed.createComponent(RegistrarFumigacion);
      otro.detectChanges();
      return otro.componentInstance;
    }

    it('converts the total amount to the unit of the dose (2 L → 2000 ml)', () => {
      const c = editar({
        dosis: 150,
        unidadMedida: 'ML',
        cantidadUsada: 2,
        unidadCantidad: 'LITROS',
      });
      expect(c.form.cantidadUsada).toBe(2000);
      expect(c.form.unidadCantidad).toBe('ML');
    });

    it('leaves an inconsistent old record as it was (does not turn kilos into litres)', () => {
      const c = editar({
        dosis: 2,
        unidadMedida: 'LITROS',
        cantidadUsada: 3,
        unidadCantidad: 'KG',
      });
      expect(c.form.cantidadUsada).toBe(3);
      expect(c.form.unidadCantidad).toBe('KG');
      expect(c.unidadesDisponibles()).toEqual(['LITROS', 'ML']);
    });

    it('fills the missing unit of the total amount with the one of the dose', () => {
      const c = editar({
        dosis: 2,
        unidadMedida: 'LITROS',
        cantidadUsada: null,
        unidadCantidad: null,
      });
      expect(c.form.unidadCantidad).toBe('LITROS');
    });
  });

  it('cantidadDe() shows what is left of the product', () => {
    expect(component.cantidadDe(component.bodega()[1])).toBe('2,5 L');
  });

  it('still lists the warehouse when the catalog fails', () => {
    inputServiceMock.getAll.mockReturnValue(throwError(() => new Error()));
    const otro = TestBed.createComponent(RegistrarFumigacion);
    otro.detectChanges();
    expect(otro.componentInstance.bodega().length).toBe(2);
    expect(otro.componentInstance.bodega()[1].insumo).toBeNull();
    expect(otro.componentInstance.error).toBe('');
  });

  it('sets an error when the warehouse cannot be loaded', () => {
    inventarioMock.stock.mockReturnValue(throwError(() => new Error()));
    const otro = TestBed.createComponent(RegistrarFumigacion);
    otro.detectChanges();
    expect(otro.componentInstance.error).toBe('siembra.spray.errors.loadStock');
    expect(otro.componentInstance.cargandoBodega()).toBe(false);
    expect(otro.componentInstance.bodega()).toEqual([]);
  });

  it('shows a link to record a purchase when the warehouse is empty', () => {
    inventarioMock.stock.mockReturnValue(of([]));
    const otro = TestBed.createComponent(RegistrarFumigacion);
    otro.detectChanges();
    const el: HTMLElement = otro.nativeElement;
    expect(el.querySelector('.bodega-vacia a')?.getAttribute('href')).toBe('/crops/inventory');
    expect(el.querySelector('.btn-catalogo')).toBeNull();
  });

  // ── verBodega / getBodegaAgrupada ────────────────────────────
  it('verBodega() toggles the warehouse list', () => {
    component.verBodega();
    expect(component.mostrarBodega()).toBe(true);
    component.verBodega();
    expect(component.mostrarBodega()).toBe(false);
  });

  it('getBodegaAgrupada() groups the warehouse by type', () => {
    const grupos = component.getBodegaAgrupada();
    expect(grupos.map((g) => g.tipo).sort()).toEqual(['', 'HERBICIDA']); // el código del tipo; la pantalla lo traduce
    expect(grupos.find((g) => g.tipo === 'HERBICIDA')!.items.map((b) => b.stock.insumoId)).toEqual([
      1,
    ]);
  });

  it('getBodegaAgrupada() applies the list filter', () => {
    component.filtroBodega = 'fungicida';
    expect(component.getBodegaAgrupada().length).toBe(0);
    component.filtroBodega = 'herbicida x';
    expect(component.getBodegaAgrupada().length).toBe(1);
  });

  it('renders the warehouse list with the quantity left', () => {
    component.verBodega();
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const filas = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.catalogo-completo .catalogo-item'),
    );
    expect(filas.length).toBe(2);
    expect(filas.some((f) => f.textContent?.includes('Herbicida X'))).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.est-stock.AGOTADO'),
    ).not.toBeNull();
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
    expect(component.error).toBe('siembra.spray.errors.productRequired');
    expect(cultivoServiceMock.registrarFumigacion).not.toHaveBeenCalled();
  });

  it('onSubmit() should set error when no unidadMedida', () => {
    component.form.producto = 'Herbicida';
    component.form.unidadMedida = '';
    component.onSubmit();
    expect(component.error).toBe('siembra.spray.errors.unitRequired');
    expect(cultivoServiceMock.registrarFumigacion).not.toHaveBeenCalled();
  });

  it('onSubmit() should call registrarFumigacion and set exito on success', async () => {
    vi.useFakeTimers();
    component.form.producto = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.form.dosis = 2;
    component.form.areaAplicada = 1;
    component.onSubmit();
    await fixture.whenStable();
    expect(cultivoServiceMock.registrarFumigacion).toHaveBeenCalled();
    expect(component.exito).toBe('siembra.spray.success');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should navigate after 1500ms on success', async () => {
    vi.useFakeTimers();
    component.form.producto = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.onSubmit();
    vi.advanceTimersByTime(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/crops/planting', 1], {
      queryParams: expect.objectContaining({ tab: 'registros' }),
    });
  });

  it('onSubmit() should set error on failure', async () => {
    cultivoServiceMock.registrarFumigacion.mockReturnValue(
      throwError(() => ({ error: { message: 'Error del servidor' } })),
    );
    component.form.producto = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error).toBe('Error del servidor');
    expect(component.cargando).toBe(false);
  });

  it('onSubmit() should set generic error when no message', async () => {
    cultivoServiceMock.registrarFumigacion.mockReturnValue(throwError(() => ({})));
    component.form.producto = 'Herbicida X';
    component.form.unidadMedida = 'LITROS';
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error).toBe('siembra.spray.errors.register');
  });

  // ── volver ───────────────────────────────────────────────────
});
