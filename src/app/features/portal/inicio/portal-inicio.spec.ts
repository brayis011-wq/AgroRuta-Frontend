import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PortalInicioComponent } from './portal-inicio';
import { PortalService } from '../../../core/services/portal.service';

describe('PortalInicioComponent', () => {
  let fixture: ComponentFixture<PortalInicioComponent>;
  let component: PortalInicioComponent;
  let portal: any;

  const aprobado: any = {
    estado: 'APROBADO',
    trabajador: { nombreCompleto: 'Luis Herrera', cedula: '1052334120', cargo: 'Recolector', estado: 'ACTIVO',
                  tipoContrato: 'JORNAL', fechaIngreso: '2025-01-10', empleador: 'Ana Rodríguez' },
  };

  async function crear(estadoInicial: any) {
    portal = {
      estado$: new BehaviorSubject(estadoInicial),
      cargarEstado: vi.fn().mockReturnValue(of(estadoInicial)),
      solicitar: vi.fn(),
      jornales: vi.fn().mockReturnValue(of([])),
      nominas: vi.fn().mockReturnValue(of([])),
      pagos: vi.fn().mockReturnValue(of([])),
    };
    await TestBed.configureTestingModule({
      imports: [PortalInicioComponent],
      providers: [provideRouter([]), { provide: PortalService, useValue: portal }],
    }).compileComponents();
    fixture = TestBed.createComponent(PortalInicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('does not load private data while the request is pending', async () => {
    await crear({ estado: 'PENDIENTE', trabajador: null });
    expect(portal.jornales).not.toHaveBeenCalled();
  });

  it('loads workdays, payrolls and payments once approved', async () => {
    await crear(aprobado);
    expect(portal.jornales).toHaveBeenCalledTimes(1);
    expect(portal.nominas).toHaveBeenCalledTimes(1);
    expect(portal.pagos).toHaveBeenCalledTimes(1);
  });

  it('sums only the unpaid payrolls', async () => {
    await crear(aprobado);
    component.nominas = [
      { id: 1, periodoInicio: '2026-10-01', periodoFin: '2026-10-15', totalJornales: 5, valorTotal: 300000, estado: 'APROBADA' },
      { id: 2, periodoInicio: '2026-09-15', periodoFin: '2026-09-30', totalJornales: 6, valorTotal: 360000, estado: 'PAGADA' },
      { id: 3, periodoInicio: '2026-10-16', periodoFin: '2026-10-31', totalJornales: 4, valorTotal: 240000, estado: 'PENDIENTE' },
    ];
    expect(component.porCobrar.length).toBe(2);
    expect(component.valorPorCobrar).toBe(540000);
  });

  it('rejects a too-short cédula without calling the API', async () => {
    await crear({ estado: 'SIN_SOLICITUD', trabajador: null });
    component.cedula = '12';
    component.solicitar();
    expect(portal.solicitar).not.toHaveBeenCalled();
    expect(component.errorSolicitud).toBe('portal.request.invalid');
  });

  it('shows the backend message when the cédula is unknown', async () => {
    await crear({ estado: 'SIN_SOLICITUD', trabajador: null });
    portal.solicitar.mockReturnValue(throwError(() => ({
      error: { message: 'Ningún agricultor ha registrado esta cédula.' },
    })));
    component.cedula = '99999999';
    component.solicitar();
    expect(component.errorSolicitud).toBe('Ningún agricultor ha registrado esta cédula.');
  });
});
