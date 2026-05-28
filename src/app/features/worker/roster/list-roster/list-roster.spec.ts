import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ListaNominasComponent } from './list-roster';
import { NominaService, TrabajadorService, PagoService } from '../../../../core/services/worker.service';
import { vi } from 'vitest';

const mkNomina = (estado = 'PENDIENTE', id = 1): any => ({
  id, trabajadorId: 1, estado, valorTotal: 100000,
  trabajador: { id: 1, nombreCompleto: 'Juan Perez' }
});
const mkTrabajador = (): any => ({ id: 1, nombreCompleto: 'Juan Perez', estado: 'ACTIVO' });
const mkPago       = (): any => ({ id: 1, nominaId: 1, monto: 100000 });

describe('ListaNominasComponent', () => {
  let component: ListaNominasComponent;
  let fixture:   ComponentFixture<ListaNominasComponent>;
  let nominaSvc:    any;
  let trabajadorSvc: any;
  let pagoSvc:      any;

  async function createComponent(queryParams: Record<string, string> = {}) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ListaNominasComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: NominaService,     useValue: nominaSvc },
        { provide: TrabajadorService, useValue: trabajadorSvc },
        { provide: PagoService,       useValue: pagoSvc },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (k: string) => queryParams[k] ?? null } } }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(ListaNominasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    nominaSvc = {
      listarTodas: vi.fn().mockReturnValue(of([mkNomina()])),
      generar:     vi.fn(),
      aprobar:     vi.fn(),
      anular:      vi.fn(),
      reactivar:   vi.fn(),
      eliminar:    vi.fn()
    };
    trabajadorSvc = {
      listar: vi.fn().mockReturnValue(of([mkTrabajador()]))
    };
    pagoSvc = {
      registrar: vi.fn()
    };
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load nominas and trabajadores', async () => {
    await createComponent();
    expect(component.nominas.length).toBe(1);
    expect(component.trabajadores.length).toBe(1);
  });

  it('ngOnInit() should filter by trabajadorId from queryParam', async () => {
    await createComponent({ trabajadorId: '1' });
    expect(component.trabajadorFiltrado).toBeTruthy();
    expect(component.trabajadorFiltrado!.id).toBe(1);
  });

  it('cargar() should set error on failure', async () => {
    nominaSvc.listarTodas.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    expect(component.error).toContain('Error');
  });

  it('puedeGenerarNomina should be true when no trabajadorFiltrado', async () => {
    await createComponent();
    component.trabajadorFiltrado = null;
    expect(component.puedeGenerarNomina).toBe(true);
  });

  it('puedeGenerarNomina should be false when trabajador has PENDIENTE nomina', async () => {
    await createComponent({ trabajadorId: '1' });
    expect(component.puedeGenerarNomina).toBe(false);
  });

  it('puedeGenerarNomina should be true when trabajador has only ANULADA nominas', async () => {
    nominaSvc.listarTodas.mockReturnValue(of([mkNomina('ANULADA')]));
    await createComponent({ trabajadorId: '1' });
    expect(component.puedeGenerarNomina).toBe(true);
  });

  it('verTodas() should clear trabajadorFiltrado and show all', async () => {
    await createComponent({ trabajadorId: '1' });
    component.verTodas();
    expect(component.trabajadorFiltrado).toBeNull();
    expect(component.nominas.length).toBe(1);
  });

  it('generar() should not call service when form invalid', async () => {
    await createComponent();
    component.generar();
    expect(nominaSvc.generar).not.toHaveBeenCalled();
  });

  it('generar() should call generar and reload on success', async () => {
    nominaSvc.generar.mockReturnValue(of(mkNomina()));
    await createComponent();
    component.form.setValue({ trabajadorId: 1, periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.mostrarForm = true;
    component.generar();
    expect(nominaSvc.generar).toHaveBeenCalled();
    expect(component.mostrarForm).toBe(false);
  });

  it('generar() should set error on failure', async () => {
    nominaSvc.generar.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    component.form.setValue({ trabajadorId: 1, periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.generar();
    expect(component.error).toContain('Error');
  });

  it('aprobar() should not call service when id is null', async () => {
    await createComponent();
    component.aprobar(undefined);
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should not call service when confirm is false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createComponent();
    component.aprobar(1);
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should approve and register pago on success', async () => {
    nominaSvc.aprobar.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(of(mkPago()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.useFakeTimers();
    await createComponent();
    component.aprobar(1);
    expect(pagoSvc.registrar).toHaveBeenCalled();
    vi.advanceTimersByTime(4000);
    expect(component.exito).toBe('');
    vi.useRealTimers();
  });

  it('aprobar() should set error when pago fails after approval', async () => {
    nominaSvc.aprobar.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.aprobar(1);
    expect(component.error).toContain('error al registrar el pago');
  });

  it('aprobar() should set error when aprobar fails', async () => {
    nominaSvc.aprobar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.aprobar(1);
    expect(component.error).toContain('Error al aprobar');
  });

  it('anular() should not call service when confirm is false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createComponent();
    component.anular(1);
    expect(nominaSvc.anular).not.toHaveBeenCalled();
  });

  it('anular() should call anular and reload on success', async () => {
    nominaSvc.anular.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.anular(1);
    expect(nominaSvc.listarTodas).toHaveBeenCalledTimes(2);
  });

  it('anular() should set error on failure', async () => {
    nominaSvc.anular.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.anular(1);
    expect(component.error).toContain('Error al anular');
  });

  it('reactivar() should not call service when confirm is false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createComponent();
    component.reactivar(1);
    expect(nominaSvc.reactivar).not.toHaveBeenCalled();
  });

  it('reactivar() should call reactivar and set exito on success', async () => {
    nominaSvc.reactivar.mockReturnValue(of(mkNomina('PENDIENTE')));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.useFakeTimers();
    await createComponent();
    component.reactivar(1);
    expect(component.exito).toContain('reactivada');
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('reactivar() should set error on failure', async () => {
    nominaSvc.reactivar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.reactivar(1);
    expect(component.error).toContain('Error al reactivar');
  });

  it('eliminar() should not call service when confirm is false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createComponent();
    component.eliminar(1);
    expect(nominaSvc.eliminar).not.toHaveBeenCalled();
  });

  it('eliminar() should remove nomina from list on success', async () => {
    nominaSvc.eliminar.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.useFakeTimers();
    await createComponent();
    component.eliminar(1);
    expect(component.nominas.length).toBe(0);
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('eliminar() should set error on failure', async () => {
    nominaSvc.eliminar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.eliminar(1);
    expect(component.error).toContain('Error al eliminar');
  });

  it('estadoClass() should return correct badge class', async () => {
    await createComponent();
    expect(component.estadoClass('PENDIENTE')).toBe('badge-borrador');
    expect(component.estadoClass('APROBADA')).toBe('badge-activo');
    expect(component.estadoClass('PAGADA')).toBe('badge-pagada');
    expect(component.estadoClass('ANULADA')).toBe('badge-inactivo');
    expect(component.estadoClass('OTRO')).toBe('');
  });

  it('invalido() should return true when field is invalid and touched', async () => {
    await createComponent();
    component.form.get('periodoInicio')!.setValue('');
    component.form.get('periodoInicio')!.markAsTouched();
    expect(component.invalido('periodoInicio')).toBe(true);
  });
});
