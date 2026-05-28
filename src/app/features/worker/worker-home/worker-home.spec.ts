import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { WorkerHomeComponent } from './worker-home';
import {
  TrabajadorService, CargoService, NominaService, PagoService
} from '../../../core/services/worker.service';
import { vi } from 'vitest';

const mkTrabajador = (overrides = {}): any => ({
  id: 1, nombre: 'Juan', apellido: 'Perez', cedula: '123',
  nombreCompleto: 'Juan Perez', estado: 'ACTIVO',
  tipoContrato: 'FIJO', cargo: { id: 1, nombre: 'Jornalero' }, ...overrides
});
const mkNomina  = (estado = 'PENDIENTE'): any => ({ id: 1, trabajadorId: 1, estado, valorTotal: 100000 });
const mkPago    = (): any => ({ id: 1, monto: 100000 });
const mkCargo   = (): any => ({ id: 1, nombre: 'Jornalero', valorJornal: 50000 });

describe('WorkerHomeComponent', () => {
  let component: WorkerHomeComponent;
  let fixture: ComponentFixture<WorkerHomeComponent>;
  let trabajadorSvc: any;
  let cargoSvc:      any;
  let nominaSvc:     any;
  let pagoSvc:       any;

  beforeEach(async () => {
    trabajadorSvc = {
      listarTodos: vi.fn().mockReturnValue(of([mkTrabajador()])),
      registrar:   vi.fn(),
      actualizar:  vi.fn(),
      cambiarCargo: vi.fn(),
      desactivar:  vi.fn(),
      suspender:   vi.fn(),
      reactivar:   vi.fn()
    };
    cargoSvc = {
      listar: vi.fn().mockReturnValue(of([mkCargo()]))
    };
    nominaSvc = {
      listarTodas: vi.fn().mockReturnValue(of([mkNomina()])),
      generar:     vi.fn()
    };
    pagoSvc = {
      listarTodos: vi.fn().mockReturnValue(of([mkPago()]))
    };

    await TestBed.configureTestingModule({
      imports: [WorkerHomeComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: TrabajadorService, useValue: trabajadorSvc },
        { provide: CargoService,      useValue: cargoSvc },
        { provide: NominaService,     useValue: nominaSvc },
        { provide: PagoService,       useValue: pagoSvc },
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(WorkerHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('cargarDatos() should load trabajadores, cargos, nominas and pagos', () => {
    expect(component.trabajadores.length).toBe(1);
    expect(component.cargos.length).toBe(1);
    expect(component.nominas.length).toBe(1);
    expect(component.pagos.length).toBe(1);
    expect(component.cargando).toBe(false);
  });

  it('cargarDatos() should set error when trabajadorService fails', () => {
    trabajadorSvc.listarTodos.mockReturnValue(throwError(() => new Error()));
    component.cargarDatos();
    expect(component.error).toContain('Error al cargar');
    expect(component.cargando).toBe(false);
  });

  it('trabajadoresFiltrados should filter by estado ACTIVO', () => {
    component.filtroEstado = 'ACTIVO';
    expect(component.trabajadoresFiltrados.length).toBe(1);
  });

  it('trabajadoresFiltrados should filter by busqueda', () => {
    component.busqueda = 'juan';
    expect(component.trabajadoresFiltrados.length).toBe(1);
    component.busqueda = 'zzz';
    expect(component.trabajadoresFiltrados.length).toBe(0);
  });

  it('trabajadoresFiltrados should filter by TODOS', () => {
    component.filtroEstado = 'TODOS';
    expect(component.trabajadoresFiltrados.length).toBe(1);
  });

  it('cantidadActivos should count ACTIVO workers', () => {
    expect(component.cantidadActivos).toBe(1);
  });

  it('cantidadSuspendidos should count SUSPENDIDO workers', () => {
    expect(component.cantidadSuspendidos).toBe(0);
  });

  it('totalPagado should sum pago montos', () => {
    expect(component.totalPagado).toBe(100000);
  });

  it('nominasPendientes should count PENDIENTE nominas', () => {
    expect(component.nominasPendientes).toBe(1);
  });

  it('abrirNuevo() should set modoPanel to nuevo', () => {
    component.abrirNuevo();
    expect(component.modoPanel).toBe('nuevo');
  });

  it('abrirDetalle() should set modoPanel to detalle', () => {
    component.abrirDetalle(mkTrabajador());
    expect(component.modoPanel).toBe('detalle');
    expect(component.trabajadorSeleccionado).toBeTruthy();
    expect(component.mostrarFormNomina).toBe(false);
  });

  it('abrirEditar() should patch formEditar', () => {
    component.abrirEditar(mkTrabajador());
    expect(component.modoPanel).toBe('editar');
    expect(component.formEditar.value.nombre).toBe('Juan');
  });

  it('abrirCambiarCargo() should patch formCargo', () => {
    component.abrirCambiarCargo(mkTrabajador());
    expect(component.modoPanel).toBe('cambiarCargo');
  });

  it('cerrarPanel() should reset panel state', () => {
    component.abrirDetalle(mkTrabajador());
    component.cerrarPanel();
    expect(component.modoPanel).toBeNull();
    expect(component.trabajadorSeleccionado).toBeNull();
  });

  it('guardarNuevo() should not call service when form invalid', () => {
    component.abrirNuevo();
    component.guardarNuevo();
    expect(trabajadorSvc.registrar).not.toHaveBeenCalled();
  });

  it('guardarNuevo() should POST and add trabajador on success', async () => {
    const nuevo = mkTrabajador({ id: 2 });
    trabajadorSvc.registrar.mockReturnValue(of(nuevo));
    vi.useFakeTimers();
    component.abrirNuevo();
    component.formNuevo.setValue({
      nombre: 'Maria', apellido: 'Lopez', cedula: '456',
      telefono: '', direccion: '', fechaIngreso: '2024-01-01',
      tipoContrato: 'FIJO', cargoId: 1
    });
    component.guardarNuevo();
    expect(component.modoPanel).toBeNull();
    expect(component.trabajadores.length).toBe(2);
    vi.advanceTimersByTime(3500);
    expect(component.exito).toBe('');
    vi.useRealTimers();
  });

  it('guardarNuevo() should set error on failure', () => {
    trabajadorSvc.registrar.mockReturnValue(throwError(() => new Error()));
    component.abrirNuevo();
    component.formNuevo.setValue({
      nombre: 'Maria', apellido: 'Lopez', cedula: '456',
      telefono: '', direccion: '', fechaIngreso: '2024-01-01',
      tipoContrato: 'FIJO', cargoId: 1
    });
    component.guardarNuevo();
    expect(component.error).toContain('Error');
  });

  it('guardarEdicion() should not call service when form invalid', () => {
    component.abrirEditar(mkTrabajador());
    component.formEditar.get('nombre')!.setValue('');
    component.guardarEdicion();
    expect(trabajadorSvc.actualizar).not.toHaveBeenCalled();
  });

  it('guardarEdicion() should PUT and update trabajador on success', async () => {
    vi.useFakeTimers();
    const updated = mkTrabajador({ nombre: 'Pedro' });
    trabajadorSvc.actualizar.mockReturnValue(of(updated));
    component.abrirEditar(mkTrabajador());
    component.guardarEdicion();
    expect(component.modoPanel).toBeNull();
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('guardarEdicion() should set error on failure', () => {
    trabajadorSvc.actualizar.mockReturnValue(throwError(() => new Error()));
    component.abrirEditar(mkTrabajador());
    component.guardarEdicion();
    expect(component.error).toContain('Error');
  });

  it('guardarCargo() should not call service when form invalid', () => {
    component.abrirCambiarCargo(mkTrabajador());
    component.formCargo.get('cargoId')!.setValue(null);
    component.guardarCargo();
    expect(trabajadorSvc.cambiarCargo).not.toHaveBeenCalled();
  });

  it('guardarCargo() should PATCH cargo on success', async () => {
    vi.useFakeTimers();
    trabajadorSvc.cambiarCargo.mockReturnValue(of(mkTrabajador()));
    component.abrirCambiarCargo(mkTrabajador());
    component.guardarCargo();
    expect(component.modoPanel).toBeNull();
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('guardarCargo() should set error on failure', () => {
    trabajadorSvc.cambiarCargo.mockReturnValue(throwError(() => new Error()));
    component.abrirCambiarCargo(mkTrabajador());
    component.guardarCargo();
    expect(component.error).toContain('Error');
  });

  it('desactivar() should call service and remove from list', async () => {
    vi.useFakeTimers();
    trabajadorSvc.desactivar.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.desactivar(mkTrabajador());
    expect(component.trabajadores.length).toBe(0);
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('desactivar() should not call service when confirm is false', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.desactivar(mkTrabajador());
    expect(trabajadorSvc.desactivar).not.toHaveBeenCalled();
  });

  it('desactivar() should set error on failure', () => {
    trabajadorSvc.desactivar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.desactivar(mkTrabajador());
    expect(component.error).toContain('Error');
  });

  it('suspender() should update estado to SUSPENDIDO', async () => {
    vi.useFakeTimers();
    trabajadorSvc.suspender.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.suspender(mkTrabajador());
    expect(component.trabajadores[0].estado).toBe('SUSPENDIDO');
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('suspender() should not call service when confirm is false', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.suspender(mkTrabajador());
    expect(trabajadorSvc.suspender).not.toHaveBeenCalled();
  });

  it('suspender() should set error on failure', () => {
    trabajadorSvc.suspender.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.suspender(mkTrabajador());
    expect(component.error).toContain('Error');
  });

  it('reactivar() should update estado to ACTIVO', async () => {
    vi.useFakeTimers();
    trabajadorSvc.reactivar.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.trabajadores = [mkTrabajador({ estado: 'SUSPENDIDO' })];
    component.reactivar(mkTrabajador({ estado: 'SUSPENDIDO' }));
    expect(component.trabajadores[0].estado).toBe('ACTIVO');
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('reactivar() should set error on failure', () => {
    trabajadorSvc.reactivar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.reactivar(mkTrabajador());
    expect(component.error).toContain('Error');
  });

  it('abrirFormNomina() should show the form', () => {
    component.abrirFormNomina();
    expect(component.mostrarFormNomina).toBe(true); // ✅
  });

  it('cerrarFormNomina() should hide the form', () => {
    component.abrirFormNomina();
    component.cerrarFormNomina();
    expect(component.mostrarFormNomina).toBe(false); // ✅
  });

  it('generarNomina() should not call service when form invalid', () => {
    component.abrirDetalle(mkTrabajador());
    component.abrirFormNomina();
    component.generarNomina();
    expect(nominaSvc.generar).not.toHaveBeenCalled();
  });

  it('generarNomina() should call generar and add nomina on success', async () => {
    vi.useFakeTimers();
    nominaSvc.generar.mockReturnValue(of(mkNomina()));
    component.abrirDetalle(mkTrabajador());
    component.abrirFormNomina();
    component.formNomina.setValue({ periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.generarNomina();
    expect(component.mostrarFormNomina).toBe(false);
    vi.advanceTimersByTime(3500);
    expect(component.exitoNomina).toBe('');
    vi.useRealTimers();
  });

  it('generarNomina() should set errorNomina on failure', () => {
    nominaSvc.generar.mockReturnValue(throwError(() => ({ error: { message: 'Error nómina' } })));
    component.abrirDetalle(mkTrabajador());
    component.abrirFormNomina();
    component.formNomina.setValue({ periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.generarNomina();
    expect(component.errorNomina).toBe('Error nómina');
  });

  it('invalido() should return true when field is invalid and touched', () => {
    component.formNuevo.get('nombre')!.setValue('');
    component.formNuevo.get('nombre')!.markAsTouched();
    expect(component.invalido(component.formNuevo, 'nombre')).toBe(true); // ✅
  });

  it('invalido() should return false when field is valid', () => {
    component.formNuevo.get('nombre')!.setValue('Test');
    component.formNuevo.get('nombre')!.markAsTouched();
    expect(component.invalido(component.formNuevo, 'nombre')).toBe(false); // ✅
  });
});
