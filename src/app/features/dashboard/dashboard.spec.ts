import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { AuthService } from '../../core/services/auth';
import { CultivoService } from '../../core/services/cultivo.service';
import { FincaActivaService } from '../../core/services/finca-activa.service';
import { JornalService, NominaService, PagoService, TrabajadorService } from '../../core/services/worker.service';

describe('DashboardComponent', () => {
  let svc: Record<string, any>;

  function crear() {
    TestBed.overrideComponent(DashboardComponent, { set: { template: '' } });
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getUsuario: () => ({ id: 3, nombre: 'Ana Rodríguez' }) } },
        { provide: CultivoService, useValue: svc['cultivo'] },
        { provide: NominaService, useValue: svc['nominas'] },
        { provide: PagoService, useValue: svc['pagos'] },
        { provide: TrabajadorService, useValue: svc['trabajadores'] },
        { provide: JornalService, useValue: svc['jornales'] },
        { provide: FincaActivaService, useValue: { paraClima: signal(null) } },
      ],
    });
    const c = TestBed.createComponent(DashboardComponent).componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    svc = {
      cultivo: { listarFincasPorAgricultor: vi.fn(() => of([{ id: 1 }])), listarLotesPorFinca: vi.fn(() => of([{ estado: 'DISPONIBLE' }])) },
      nominas: { listarTodas: vi.fn(() => of([{ estado: 'PENDIENTE', valorTotal: 10 }])) },
      pagos: { listarTodos: vi.fn(() => of([])) },
      trabajadores: { listarTodos: vi.fn(() => of([{ id: 5, estado: 'ACTIVO' }, { id: 6, estado: 'INACTIVO' }])) },
      jornales: { porTrabajador: vi.fn(() => of([])) },
    };
  });

  it('loads everything and lists only what needs attention', () => {
    const c = crear();
    expect(c.cargando()).toBe(false);
    expect(c.pendientes().map((p) => p.clave)).toEqual(['toApprove', 'noWage', 'freeLots']);
  });

  it('asks work days only for active workers', () => {
    crear();
    expect(svc['jornales'].porTrabajador).toHaveBeenCalledTimes(1);
    expect(svc['jornales'].porTrabajador.mock.calls[0][0]).toBe(5);
  });

  it('still shows the rest when one source fails', () => {
    svc['nominas'].listarTodas = vi.fn(() => throwError(() => new Error('x')));
    const c = crear();
    expect(c.resumen()!.porAprobar.n).toBe(0);
    expect(c.resumen()!.lotesDisponibles).toBe(1);
  });

  it('uses the first name in the greeting', () => {
    expect(crear().nombreCorto()).toBe('Ana');
  });
});
