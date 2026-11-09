import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { ListaPagosComponent } from './list-payment';
import { PagoService, NominaService } from '../../../../core/services/worker.service';

const mockPagos = [
  { id: 1, trabajadorNombre: 'Juan', monto: 500000, nominaId: 10, metodoPago: 'EFECTIVO' },
  { id: 2, trabajadorNombre: 'Juan', monto: 300000, nominaId: 10, metodoPago: 'TRANSFERENCIA' },
  { id: 3, trabajadorNombre: 'Maria', monto: 400000, nominaId: 11, metodoPago: 'NEQUI' },
];
const mockNomina = { id: 10, fecha: '2024-04-01', total: 800000 };

describe('ListaPagosComponent', () => {
  let component: ListaPagosComponent;
  let fixture: ComponentFixture<ListaPagosComponent>;
  let pagoServiceMock: any;
  let nominaServiceMock: any;

  beforeEach(async () => {
    pagoServiceMock = {
      pagina: vi.fn().mockReturnValue(of({ contenido: mockPagos, pagina: 0, tamano: 20, total: 3, totalPaginas: 1 })),
      resumen: vi.fn().mockReturnValue(of({ cantidad: 3, total: 1200000, trabajadores: 2 })),
    };
    nominaServiceMock = { obtener: vi.fn().mockReturnValue(of(mockNomina)) };
    await TestBed.configureTestingModule({
      imports: [ListaPagosComponent, CommonModule, RouterModule.forRoot([])],
      providers: [
        { provide: PagoService, useValue: pagoServiceMock },
        { provide: NominaService, useValue: nominaServiceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        ChangeDetectorRef,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListaPagosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('ngOnInit() carga la primera página y el resumen', () => {
    expect(pagoServiceMock.pagina).toHaveBeenCalledWith(0, null);
    expect(component.pagos).toEqual(mockPagos);
    expect(component.totalTrabajadores).toBe(2);
    expect(component.hayMas).toBe(false);
  });
  it('ngOnInit() should set error on failure', () => {
    pagoServiceMock.pagina.mockReturnValue(throwError(() => new Error()));
    component.ngOnInit();
    expect(component.error).toBe('workers.payments.errors.load');
  });
  it('los totales salen del resumen del servidor', () => {
    expect(component.totalGlobal).toBe(1200000);
    expect(component.totalPagos).toBe(3);
  });
  it('ultimoPago es el primero de la lista (viene ordenada del servidor)', () => {
    expect(component.ultimoPago).toEqual(mockPagos[0]);
  });
  it('cargarMas() suma la página siguiente', () => {
    const otro = { id: 4, trabajadorNombre: 'Ana', monto: 100000, nominaId: 12 };
    pagoServiceMock.pagina
      .mockReturnValueOnce(of({ contenido: mockPagos.slice(0, 2), pagina: 0, tamano: 2, total: 4, totalPaginas: 2 }))
      .mockReturnValueOnce(of({ contenido: [otro], pagina: 1, tamano: 2, total: 4, totalPaginas: 2 }));
    component.ngOnInit();
    expect(component.hayMas).toBe(true);
    component.cargarMas();
    expect(pagoServiceMock.pagina).toHaveBeenLastCalledWith(1, null);
    expect(component.pagos.map(p => p.id)).toEqual([1, 2, 4]);
  });
  it('verTodos() quita el filtro de nómina y recarga', () => {
    component.nominaIdFiltro = 10;
    component.verTodos();
    expect(component.nominaIdFiltro).toBeNull();
    expect(pagoServiceMock.resumen).toHaveBeenLastCalledWith(null);
  });
  it('abrirDetalle() should set pagoSeleccionado', () => {
    component.abrirDetalle(mockPagos[0] as any);
    expect(component.pagoSeleccionado).toEqual(mockPagos[0]);
  });
  it('abrirDetalle() should load nomina', () => {
    component.abrirDetalle(mockPagos[0] as any);
    expect(nominaServiceMock.obtener).toHaveBeenCalledWith(10);
  });
  it('abrirDetalle() should handle nomina error', () => {
    nominaServiceMock.obtener.mockReturnValue(throwError(() => new Error()));
    component.abrirDetalle(mockPagos[0] as any);
    expect(component.cargandoDetalle).toBe(false);
  });
  it('abrirDetalle() should not call nominaService when no nominaId', () => {
    nominaServiceMock.obtener.mockClear();
    component.abrirDetalle({ id: 5, trabajadorNombre: 'Test', monto: 100 } as any);
    expect(nominaServiceMock.obtener).not.toHaveBeenCalled();
  });
  it('cerrarDetalle() should clear selection', () => {
    component.pagoSeleccionado = mockPagos[0] as any;
    component.cerrarDetalle();
    expect(component.pagoSeleccionado).toBeNull();
  });
  it('metodoPagoIcon() should return correct icons', () => {
    expect(component.metodoPagoIcon('EFECTIVO')).toBe('💵');
    expect(component.metodoPagoIcon('TRANSFERENCIA')).toBe('🏦');
    expect(component.metodoPagoIcon(undefined)).toBe('💳');
  });
  it('iniciales() should return uppercase initials', () => {
    expect(component.iniciales('Juan Perez')).toBe('JP');
  });
});
