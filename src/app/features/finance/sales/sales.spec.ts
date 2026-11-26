import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VentasComponent } from './sales';
import { PreciosService, VentasService } from '../../../core/services/finance.service';
import { JornalService } from '../../../core/services/worker.service';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { KilosEnBodega, Venta } from '../../../core/models/finance.model';
import { CultivoService } from '../../../core/services/crop.service';

/** Cosechas de la siembra 34: 380 kg vendidos 120 → de la vieja quedan 260; la de segunda está entera */
const cosechasCafe = {
  listarCosechas: vi.fn().mockReturnValue(
    of([
      {
        id: 1,
        fecha: '2026-11-12',
        cantidadKg: 300,
        calidad: 'PRIMERA',
        siembraId: 34,
        recolectores: [{ trabajadorId: 1, modalidad: 'KILO', nombre: 'Marta Salazar' }],
      },
      {
        id: 2,
        fecha: '2026-11-15',
        cantidadKg: 80,
        calidad: 'SEGUNDA',
        siembraId: 34,
        recolectores: [],
      },
    ]),
  ),
};

const bodega: KilosEnBodega[] = [
  {
    siembraId: 10,
    cultivo: 'Aguacate',
    variedad: 'Choquette',
    lote: 'Lote A',
    finca: 'La Loma',
    kgCosechados: 75,
    kgVendidos: 150,
    kgDisponibles: 0,
    kgSinCosecha: 75,
    ultimaCosecha: '2026-11-22',
    finalizada: false,
  },
  {
    siembraId: 34,
    cultivo: 'Café',
    variedad: 'Castillo',
    lote: 'Cafetal',
    finca: 'El Mirador',
    kgCosechados: 380,
    kgVendidos: 120,
    kgDisponibles: 260,
    kgSinCosecha: 0,
    ultimaCosecha: '2026-11-12',
    finalizada: false,
  },
];

const ventaVieja = {
  id: 5,
  siembraId: 10,
  siembraNombre: 'Aguacate Choquette · Lote A',
  comprador: 'Cooperativa',
  fecha: '2026-11-22',
  producto: 'Aguacate Choquette',
  cantidadKg: 100,
  precioKg: 5957,
  total: 595700,
  vence: null,
  observaciones: null,
  abonado: 595700,
  saldo: 0,
  estado: 'PAGADA',
  abonos: [],
} as unknown as Venta;

describe('VentasComponent: vender desde la bodega de la cosecha', () => {
  let component: VentasComponent;
  let ventas: any;

  beforeEach(() => {
    ventas = {
      listar: vi.fn().mockReturnValue(of([ventaVieja])),
      resumen: vi.fn().mockReturnValue(
        of({
          porCobrar: 0,
          vencido: 0,
          vendidoMes: 0,
          cobradoMes: 0,
          ventasPendientes: 0,
          ventasVencidas: 0,
          compradores: [],
        }),
      ),
      compradores: vi.fn().mockReturnValue(of([])),
      kilosEnBodega: vi.fn().mockReturnValue(of(bodega)),
      crear: vi.fn().mockReturnValue(of({})),
      actualizar: vi.fn().mockReturnValue(of({})),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: VentasService, useValue: ventas },
        { provide: PreciosService, useValue: { deCultivo: vi.fn().mockReturnValue(of(null)) } },
        {
          provide: JornalService,
          useValue: { cultivosDisponibles: vi.fn().mockReturnValue(of([])) },
        },
        { provide: ConfirmService, useValue: { preguntar: vi.fn() } },
        { provide: CultivoService, useValue: cosechasCafe },
      ],
    });
    component = TestBed.runInInjectionContext(() => new VentasComponent());
    component.ngOnInit();
  });

  it('solo ofrece las siembras con kilos por vender y avisa las que vendieron de más', () => {
    component.nueva();
    expect(component.opcionesSiembra().map((o) => o.id)).toEqual([34]);
    expect(component.sobrevendidas().map((k) => k.siembraId)).toEqual([10]);
    expect(component.kgPorVender()).toBe(260);
  });

  it('con una sola siembra con kilos, la venta nueva ya sale llena', () => {
    component.nuevaVenta();
    const f = component.form()!;
    expect(f.siembraId).toBe(34);
    expect(f.producto).toBe('Café Castillo');
    expect(f.cantidadKg).toBe(260);
  });

  it('no deja vender más kilos de los que quedan ni una venta de siembra sin kilos', () => {
    component.nuevaVenta();
    component.campo('comprador', 'Cooperativa');
    component.campo('precioKg', 18000);
    component.campo('cantidadKg', 261);
    expect(component.pasaDeLoQueQueda(component.form()!)).toBe(true);
    component.guardar();
    expect(component.errorPanel()).toBe('ventas.stock.tooMuch');

    component.campo('cantidadKg', null);
    component.campo('total', 100000);
    component.guardar();
    expect(component.errorPanel()).toBe('ventas.stock.needKg');
    expect(ventas.crear).not.toHaveBeenCalled();

    component.campo('cantidadKg', 260);
    component.guardar();
    expect(ventas.crear).toHaveBeenCalledWith(
      expect.objectContaining({ siembraId: 34, cantidadKg: 260 }),
    );
  });

  it('una venta de antes que ya pasaba de lo cosechado se puede guardar si no sube los kilos', () => {
    component.editar(ventaVieja);
    expect(component.opcionesSiembra().map((o) => o.id)).toContain(10);
    expect(component.pasaDeLoQueQueda(component.form()!)).toBe(false);
    component.campo('cantidadKg', 101);
    expect(component.pasaDeLoQueQueda(component.form()!)).toBe(true);
  });
  it('muestra de qué cosechas salen los kilos y deja vender todo, solo una calidad o lo marcado', () => {
    component.nuevaVenta();
    expect(component.origen().map((o) => [o.id, o.quedan])).toEqual([
      [2, 80],
      [1, 180],
    ]);
    expect(component.origen().find((o) => o.id === 1)!.recolectores).toEqual(['Marta Salazar']);
    component.elegirCalidad('SEGUNDA');
    expect(component.form()!.cantidadKg).toBe(80);
    component.alternarCosecha(1);
    expect(component.form()!.cantidadKg).toBe(260);
    component.alternarCosecha(2);
    expect(component.form()!.cantidadKg).toBe(180);
    component.elegirCalidad(null);
    expect(component.form()!.cantidadKg).toBe(260);
  });
});

describe('VentasComponent: precio de referencia', () => {
  it('en una venta nueva pone solo el precio de referencia del cultivo', async () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        {
          provide: VentasService,
          useValue: {
            listar: vi.fn().mockReturnValue(of([])),
            compradores: vi.fn().mockReturnValue(of([])),
            resumen: vi.fn().mockReturnValue(
              of({
                porCobrar: 0,
                vencido: 0,
                vendidoMes: 0,
                cobradoMes: 0,
                ventasPendientes: 0,
                ventasVencidas: 0,
                compradores: [],
              }),
            ),
            kilosEnBodega: vi.fn().mockReturnValue(of(bodega)),
          },
        },
        {
          provide: PreciosService,
          useValue: {
            deCultivo: vi.fn().mockReturnValue(
              of({
                cultivo: 'Café',
                fuente: 'PROPIO',
                producto: null,
                precioKg: 17800.4,
                alternativas: [],
              }),
            ),
          },
        },
        {
          provide: JornalService,
          useValue: { cultivosDisponibles: vi.fn().mockReturnValue(of([])) },
        },
        { provide: ConfirmService, useValue: { preguntar: vi.fn() } },
        { provide: CultivoService, useValue: cosechasCafe },
      ],
    });
    const c = TestBed.runInInjectionContext(() => new VentasComponent());
    c.ngOnInit();
    c.nuevaVenta();
    vi.advanceTimersByTime(400);
    expect(c.form()!.precioKg).toBe(17800);
    vi.useRealTimers();
  });
});
