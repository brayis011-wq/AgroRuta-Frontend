import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PrecargaDatosService } from './offline-data-preload';
import { ColaSinConexionService } from './offline-queue.service';
import { AuthService } from '../services/auth.service';
import { CultivoService } from '../services/crop.service';
import { JornalService, LaborService, TrabajadorService } from '../services/worker.service';
import { InventarioService } from '../services/inventory.service';
import { AgriculturalInputService } from '../services/agricultural-input.service';
import { VentasService } from '../services/finance.service';
import { AvisosService } from '../services/toast.service';

describe('PrecargaDatosService', () => {
  let usuario: { id: number; rol: string };
  let enLinea: ReturnType<typeof signal<boolean>>;
  let cultivo: Record<string, ReturnType<typeof vi.fn>>;
  const lista = () => vi.fn(() => of([]));

  beforeEach(() => {
    localStorage.clear();
    usuario = { id: 5, rol: 'Agricultor' };
    enLinea = signal(true);
    cultivo = {
      listarFincasPorAgricultor: vi.fn(() => of([{ id: 1 }])),
      listarLotesPorFinca: vi.fn(() => of([{ id: 10, estado: 'EN_CULTIVO' }, { id: 11, estado: 'DISPONIBLE' }])),
      buscarSiembraPorLote: vi.fn(() => of({ id: 100, loteId: 10 })),
      buscarFinca: vi.fn(() => of({ id: 1 })),
      buscarLote: vi.fn(() => of({ id: 10 })),
      buscarSiembra: vi.fn(() => of({ id: 100 })),
      resumenSiembra: vi.fn(() => of({})),
      listarActividades: lista(),
      listarFumigaciones: lista(),
      // Si una consulta falla, las demás siguen
      listarCosechas: vi.fn(() => throwError(() => new Error('sin red'))),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getUsuario: () => usuario } },
        { provide: ColaSinConexionService, useValue: { enLinea } },
        { provide: CultivoService, useValue: cultivo },
        { provide: TrabajadorService, useValue: { listar: lista(), listarTodos: lista() } },
        { provide: LaborService, useValue: { listar: lista() } },
        { provide: JornalService, useValue: { cultivosDisponibles: lista() } },
        { provide: InventarioService, useValue: { stock: lista() } },
        { provide: AgriculturalInputService, useValue: { getAll: lista() } },
        { provide: VentasService, useValue: { kilosEnBodega: lista(), listar: lista(), resumen: vi.fn(() => of({})) } },
      ],
    });
  });

  it('descarga lo que piden los formularios, solo de las siembras en curso, y anota cuándo', async () => {
    const precarga = TestBed.inject(PrecargaDatosService);
    await precarga.descargar();
    expect(cultivo['buscarSiembraPorLote']).toHaveBeenCalledTimes(1);
    expect(cultivo['buscarSiembraPorLote']).toHaveBeenCalledWith(10);
    expect(cultivo['listarActividades']).toHaveBeenCalledWith(100);
    expect(cultivo['listarCosechas']).toHaveBeenCalledWith(100);
    expect(cultivo['resumenSiembra']).toHaveBeenCalledWith(100);
    expect(precarga.ultima()).not.toBeNull();
    expect(localStorage.getItem('agroruta.sinConexion.descargado.5')).toBe(precarga.ultima());
    expect(precarga.descargando()).toBe(false);
  });

  it('no vuelve a descargar si la última es reciente', async () => {
    localStorage.setItem('agroruta.sinConexion.descargado.5', new Date().toISOString());
    const precarga = TestBed.inject(PrecargaDatosService);
    precarga.siHaceFalta(60 * 60 * 1000);
    await new Promise((r) => setTimeout(r));
    expect(cultivo['listarFincasPorAgricultor']).not.toHaveBeenCalled();
  });

  it('sin señal o si no es agricultor no descarga nada', async () => {
    const precarga = TestBed.inject(PrecargaDatosService);
    enLinea.set(false);
    precarga.siHaceFalta(0);
    usuario = { id: 7, rol: 'Trabajador' };
    enLinea.set(true);
    await precarga.descargar();
    expect(cultivo['listarFincasPorAgricultor']).not.toHaveBeenCalled();
    expect(precarga.ultima()).toBeNull();
  });
});

describe('AvisosService sin señal', () => {
  it('si el registro quedó en el teléfono, el aviso de guardado lo dice tal cual', () => {
    const avisos = new AvisosService();
    avisos.marcarGuardadoSinSenal();
    avisos.exito('ventas.saved');
    expect(avisos.actual()?.clave).toBe('offline.savedToast');
    // El siguiente aviso ya es el normal
    avisos.exito('ventas.saved');
    expect(avisos.actual()?.clave).toBe('ventas.saved');
  });
});
