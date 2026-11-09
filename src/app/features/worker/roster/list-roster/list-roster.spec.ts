import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ListaNominasComponent } from './list-roster';
import { NominaService, TrabajadorService, PagoService } from '../../../../core/services/worker.service';
import { vi } from 'vitest';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';

const mkNomina = (estado = 'PENDIENTE', id = 1): any => ({
  id, trabajadorId: 1, estado, valorTotal: 100000,
  trabajador: { id: 1, nombreCompleto: 'Juan Perez' }
});
const mkTrabajador = (): any => ({ id: 1, nombreCompleto: 'Juan Perez', estado: 'ACTIVO' });
/** Respuesta de GET /api/payrolls/page con todas las nóminas en una sola página */
const pag = (lista: any[]): any => ({ contenido: lista, pagina: 0, tamano: 20, total: lista.length, totalPaginas: 1 });
/** Respuesta de GET /api/payrolls/summary calculada a partir de la lista */
const resumenDe = (lista: any[]): any[] => {
  const m: Record<string, any> = {};
  for (const n of lista) {
    m[n.estado] ??= { estado: n.estado, cantidad: 0, total: 0 };
    m[n.estado].cantidad++;
    m[n.estado].total += n.valorTotal;
  }
  return Object.values(m);
};

describe('ListaNominasComponent', () => {
  let component: ListaNominasComponent;
  let fixture:   ComponentFixture<ListaNominasComponent>;
  let nominaSvc:    any;
  let trabajadorSvc: any;
  let pagoSvc:      any;

  // El diálogo de confirmación responde lo que diga cada prueba
  let respuesta = true;
  const confirmSvc = { preguntar: vi.fn(() => Promise.resolve(respuesta)) };

  async function createComponent(queryParams: Record<string, string> = {}) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ListaNominasComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ConfirmService, useValue: confirmSvc },
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
    respuesta = true;
    nominaSvc = {
      pagina:      vi.fn().mockReturnValue(of(pag([mkNomina()]))),
      resumen:     vi.fn().mockReturnValue(of(resumenDe([mkNomina()]))),
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

  /** Lo que devuelve el servidor: la página y el resumen de esas nóminas */
  function datos(lista: any[]) {
    nominaSvc.pagina.mockReturnValue(of(pag(lista)));
    nominaSvc.resumen.mockReturnValue(of(resumenDe(lista)));
  }

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
    nominaSvc.pagina.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    expect(component.error).toContain('workers.rosters.list.errors.');
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
    datos([mkNomina('ANULADA')]);
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
    expect(component.error).toContain('workers.rosters.list.errors.');
  });

  it('aprobar() should not call service when id is null', async () => {
    await createComponent();
    await component.aprobar(undefined);
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should not call service when confirm is false', async () => {
    respuesta = false;
    await createComponent();
    await component.aprobar(1);
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should only approve (no pago) and reload on success', async () => {
    nominaSvc.aprobar.mockReturnValue(of(mkNomina('APROBADA')));
    respuesta = true;
    vi.useFakeTimers();
    await createComponent();
    await component.aprobar(1);
    expect(nominaSvc.aprobar).toHaveBeenCalledWith(1);
    expect(pagoSvc.registrar).not.toHaveBeenCalled();
    expect(nominaSvc.pagina).toHaveBeenCalledTimes(2);
    expect(component.exito).toBe('workers.rosters.list.success.approved');
    expect(component.aprobando).toBeNull();
    vi.advanceTimersByTime(4000);
    expect(component.exito).toBe('');
    vi.useRealTimers();
  });

  it('aprobar() should set error when aprobar fails', async () => {
    nominaSvc.aprobar.mockReturnValue(throwError(() => new Error()));
    respuesta = true;
    await createComponent();
    await component.aprobar(1);
    expect(component.error).toBe('workers.rosters.list.errors.approve');
    expect(component.aprobando).toBeNull();
  });

  it('puedeGenerarNomina should be false when trabajador has APROBADA nomina', async () => {
    datos([mkNomina('APROBADA')]);
    await createComponent({ trabajadorId: '1' });
    expect(component.puedeGenerarNomina).toBe(false);
  });

  it('anular() should not call service when confirm is false', async () => {
    respuesta = false;
    await createComponent();
    await component.anular(1);
    expect(nominaSvc.anular).not.toHaveBeenCalled();
  });

  it('anular() should call anular and reload on success', async () => {
    nominaSvc.anular.mockReturnValue(of(undefined));
    respuesta = true;
    await createComponent();
    await component.anular(1);
    expect(nominaSvc.pagina).toHaveBeenCalledTimes(2);
  });

  it('anular() should set error on failure', async () => {
    nominaSvc.anular.mockReturnValue(throwError(() => new Error()));
    respuesta = true;
    await createComponent();
    await component.anular(1);
    expect(component.error).toBe('workers.rosters.list.errors.cancel');
  });

  it('reactivar() should not call service when confirm is false', async () => {
    respuesta = false;
    await createComponent();
    await component.reactivar(1);
    expect(nominaSvc.reactivar).not.toHaveBeenCalled();
  });

  it('reactivar() should call reactivar and set exito on success', async () => {
    nominaSvc.reactivar.mockReturnValue(of(mkNomina('PENDIENTE')));
    respuesta = true;
    vi.useFakeTimers();
    await createComponent();
    await component.reactivar(1);
    expect(component.exito).toBe('workers.rosters.list.success.reactivated');
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('reactivar() should set error on failure', async () => {
    nominaSvc.reactivar.mockReturnValue(throwError(() => new Error()));
    respuesta = true;
    await createComponent();
    await component.reactivar(1);
    expect(component.error).toBe('workers.rosters.list.errors.reactivate');
  });

  it('eliminar() should not call service when confirm is false', async () => {
    respuesta = false;
    await createComponent();
    await component.eliminar(1);
    expect(nominaSvc.eliminar).not.toHaveBeenCalled();
  });

  it('eliminar() should remove nomina from list on success', async () => {
    nominaSvc.eliminar.mockReturnValue(of(undefined));
    respuesta = true;
    vi.useFakeTimers();
    await createComponent();
    datos([]);   // después de borrar, el servidor ya no la devuelve
    await component.eliminar(1);
    expect(component.nominas.length).toBe(0);
    vi.advanceTimersByTime(3500);
    vi.useRealTimers();
  });

  it('eliminar() should set error on failure', async () => {
    nominaSvc.eliminar.mockReturnValue(throwError(() => new Error()));
    respuesta = true;
    await createComponent();
    await component.eliminar(1);
    expect(component.error).toBe('workers.rosters.list.errors.delete');
  });

  it('ngOnInit() pide la primera página filtrada por el trabajador de la URL', async () => {
    await createComponent({ trabajadorId: '1' });
    expect(nominaSvc.pagina).toHaveBeenCalledWith(0, { trabajadorId: 1, estado: null });
    expect(nominaSvc.resumen).toHaveBeenCalledWith(1);
  });

  it('las tarjetas salen del resumen del servidor, no de las páginas cargadas', async () => {
    nominaSvc.resumen.mockReturnValue(of([
      { estado: 'PENDIENTE', cantidad: 30, total: 3000000 },
      { estado: 'PAGADA', cantidad: 12, total: 1200000 },
    ]));
    await createComponent();
    expect(component.cuenta('PENDIENTE')).toBe(30);
    expect(component.suma('PAGADA')).toBe(1200000);
    expect(component.totalNominas).toBe(42);
  });

  it('cambiar el filtro de estado vuelve a pedir la primera página con ese estado', async () => {
    await createComponent();
    component.filtroEstado = 'PAGADA';
    expect(nominaSvc.pagina).toHaveBeenLastCalledWith(0, { trabajadorId: null, estado: 'PAGADA' });
    component.filtroEstado = 'TODAS';
    expect(nominaSvc.pagina).toHaveBeenLastCalledWith(0, { trabajadorId: null, estado: null });
  });

  it('cargarMas() suma la página siguiente', async () => {
    nominaSvc.pagina
      .mockReturnValueOnce(of({ contenido: [mkNomina('PENDIENTE', 1)], pagina: 0, tamano: 1, total: 2, totalPaginas: 2 }))
      .mockReturnValueOnce(of({ contenido: [mkNomina('PAGADA', 2)], pagina: 1, tamano: 1, total: 2, totalPaginas: 2 }));
    await createComponent();
    expect(component.hayMas).toBe(true);
    component.cargarMas();
    expect(nominaSvc.pagina).toHaveBeenLastCalledWith(1, { trabajadorId: null, estado: null });
    expect(component.nominas.map((n: any) => n.id)).toEqual([1, 2]);
    expect(component.hayMas).toBe(false);
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
