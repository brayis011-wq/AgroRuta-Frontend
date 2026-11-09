import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InventarioComponent } from './inventory';
import { InventarioService } from '../../../core/services/inventory.service';
import { AgriculturalInputService } from '../../../core/services/agricultural-input.service';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { StockInsumo } from '../../../core/models/inventory.model';

const glifosato: StockInsumo = {
  insumoId: 1, nombre: 'Glifosato', tipo: 'HERBICIDA', unidadBase: 'ML', cantidad: 750, stockMinimo: 1000,
  costoPromedio: 30, valorStock: 22500, estado: 'BAJO', ultimoMovimiento: '2026-11-05',
};
const mancozeb: StockInsumo = {
  insumoId: 2, nombre: 'Mancozeb', tipo: 'FUNGICIDA', unidadBase: 'GRAMOS', cantidad: 3000, stockMinimo: null,
  costoPromedio: null, valorStock: null, estado: 'OK', ultimoMovimiento: '2026-11-01',
};

describe('InventarioComponent', () => {
  let fixture: ComponentFixture<InventarioComponent>;
  let component: InventarioComponent;
  let inventario: Record<string, ReturnType<typeof vi.fn>>;
  let respuesta = true;

  beforeEach(async () => {
    respuesta = true;
    inventario = {
      stock: vi.fn().mockReturnValue(of([glifosato, mancozeb])),
      movimientos: vi.fn().mockReturnValue(of([
        { id: 10, insumoId: 1, tipo: 'COMPRA', cantidad: 1000, fecha: '2026-11-01', costoTotal: 30000, proveedor: null, fumigacionId: null, observaciones: null },
        { id: 11, insumoId: 1, tipo: 'USO', cantidad: 250, fecha: '2026-11-05', costoTotal: null, proveedor: null, fumigacionId: 7, observaciones: null },
      ])),
      registrarCompra: vi.fn().mockReturnValue(of({})),
      ajustar: vi.fn().mockReturnValue(of({})),
      definirMinimo: vi.fn().mockReturnValue(of(glifosato)),
      eliminarMovimiento: vi.fn().mockReturnValue(of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [
        { provide: InventarioService, useValue: inventario },
        { provide: AgriculturalInputService, useValue: { getAll: () => of([
          { id: 1, nombre: 'Glifosato', tipo: 'HERBICIDA', unidadSugerida: 'LITROS' },
          { id: 2, nombre: 'Mancozeb', tipo: 'FUNGICIDA', unidadSugerida: 'GRAMOS' },
        ]) } },
        { provide: ConfirmService, useValue: { preguntar: vi.fn(() => Promise.resolve(respuesta)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga el stock y cuenta lo que necesita atención', () => {
    expect(component.stock()?.length).toBe(2);
    expect(component.conAvisos()).toBe(1);
    expect(component.valorTotal()).toBe(22500);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Glifosato');
    expect(texto).toContain('750 ml');
    expect(texto).toContain('3 kg');
  });

  it('muestra el costo por litro o por kilo', () => {
    expect(component.costoGrande(glifosato)).toContain('30.000');
    expect(component.costoGrande(glifosato)).toContain('/ L');
    expect(component.costoGrande(mancozeb)).toBe('—');
  });

  it('la compra toma la unidad grande del insumo elegido y envía la petición', () => {
    component.abrirCompra();
    component.compra.controls.insumoId.setValue(2);
    expect(component.compra.value.unidad).toBe('KG');
    component.compra.patchValue({ cantidad: 5, costoTotal: 120000, proveedor: 'Agro El Valle' });

    component.guardarCompra();

    expect(inventario['registrarCompra']).toHaveBeenCalledWith(expect.objectContaining({
      insumoId: 2, cantidad: 5, unidad: 'KG', costoTotal: 120000, proveedor: 'Agro El Valle',
    }));
    expect(component.panel()).toBeNull();
  });

  it('una compra sin insumo no se envía', () => {
    component.abrirCompra();
    component.compra.patchValue({ cantidad: 5 });
    component.guardarCompra();
    expect(inventario['registrarCompra']).not.toHaveBeenCalled();
  });

  it('el conteo se precarga con lo que hay, en litros o kilos', () => {
    component.abrirAjuste(glifosato);
    expect(component.ajuste.value.cantidadReal).toBe(0.75);
    expect(component.ajuste.value.unidad).toBe('LITROS');
    component.ajuste.patchValue({ cantidadReal: 0.5 });
    component.guardarAjuste();
    expect(inventario['ajustar']).toHaveBeenCalledWith(expect.objectContaining({ insumoId: 1, cantidadReal: 0.5, unidad: 'LITROS' }));
  });

  it('quitar el mínimo envía null', () => {
    component.abrirMinimo(glifosato);
    expect(component.minimo.value.minimo).toBe(1);
    component.guardarMinimo(true);
    expect(inventario['definirMinimo']).toHaveBeenCalledWith(1, null, 'LITROS');
  });

  it('el historial muestra compras y gastos de fumigaciones con su signo', () => {
    component.alternarHistorial(glifosato);
    fixture.detectChanges();
    const movs = component.movimientos();
    expect(movs.length).toBe(2);
    expect(component.efecto(movs[1])).toBe(-250);
  });

  it('el error del backend se muestra en el formulario', () => {
    inventario['registrarCompra'].mockReturnValue(throwError(() => ({ error: { message: 'Glifosato se mide en litros o mililitros.' } })));
    component.abrirCompra();
    component.compra.patchValue({ insumoId: 1, cantidad: 2 });
    component.guardarCompra();
    expect(component.errorForm()).toBe('Glifosato se mide en litros o mililitros.');
    expect(component.panel()).toBe('compra');
  });
});
