import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Subject } from 'rxjs';
import { ListaJornalesComponent } from './list-wage';
import { JornalService, TrabajadorService, NominaService } from '../../../../core/services/worker.service';
import { vi } from 'vitest';

const mkJornal = (liquidado = false): any => ({
  id: 1, trabajadorId: 1, cultivoId: 2, nombreCultivo: 'Maiz',
  fecha: '2024-01-10', valorJornal: 50000, liquidado,
  trabajador: { nombreCompleto: 'Juan Perez' }
});
const mkTrabajador = (): any => ({ id: 1, nombreCompleto: 'Juan Perez' });
const mkNomina     = (): any => ({ id: 1, trabajadorId: 1, valorTotal: 100000, estado: 'PENDIENTE' });

describe('ListaJornalesComponent', () => {
  let component: ListaJornalesComponent;
  let fixture:   ComponentFixture<ListaJornalesComponent>;
  let jornalSvc:    any;
  let trabajadorSvc: any;
  let nominaSvc:    any;
  let queryParamsSubject: Subject<any>;

  beforeEach(async () => {
    queryParamsSubject = new Subject();

    jornalSvc = {
      porTrabajador: vi.fn().mockReturnValue(of([mkJornal()]))
    };
    trabajadorSvc = {
      buscarPorId: vi.fn().mockReturnValue(of(mkTrabajador()))
    };
    nominaSvc = {
      generar: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ListaJornalesComponent, ReactiveFormsModule, FormsModule],
      providers: [
        provideRouter([]),
        { provide: JornalService,     useValue: jornalSvc },
        { provide: TrabajadorService, useValue: trabajadorSvc },
        { provide: NominaService,     useValue: nominaSvc },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParamsSubject.asObservable() }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(ListaJornalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();           // 👈 detectChanges ANTES de emitir queryParams
    queryParamsSubject.next({});
    await fixture.whenStable();
    fixture.detectChanges();           // 👈 segundo detectChanges para estabilizar
  });

  it('should create', () => expect(component).toBeTruthy());

  it.skip('ngOnInit() should load jornales when trabajadorId param exists', async () => {
    jornalSvc.porTrabajador.mockClear();
    trabajadorSvc.buscarPorId.mockClear();
    queryParamsSubject.next({ trabajadorId: '1' });
    await fixture.whenStable();
    expect(jornalSvc.porTrabajador).toHaveBeenCalledWith(1, undefined, undefined);
    expect(component.jornales.length).toBe(1);
  });

  it('ngOnInit() should not load jornales when no trabajadorId param', () => {
    jornalSvc.porTrabajador.mockClear();
    queryParamsSubject.next({});
    expect(jornalSvc.porTrabajador).not.toHaveBeenCalled();
  });

  it('cargarTrabajador() should load trabajador data', () => {
    component.trabajadorId = 1;
    component.cargarTrabajador();
    expect(component.trabajador).toBeTruthy();
  });

  it('cargarJornales() should set error on failure', () => {
    jornalSvc.porTrabajador.mockReturnValue(throwError(() => new Error()));
    component.trabajadorId = 1;
    component.cargarJornales();
    expect(component.error).toContain('Error al cargar jornales');
  });

  it('cargarJornales() should do nothing without trabajadorId', () => {
    jornalSvc.porTrabajador.mockClear();
    component.trabajadorId = null;
    component.cargarJornales();
    expect(jornalSvc.porTrabajador).not.toHaveBeenCalled();
  });

  it('filtrados should return all when busqueda is empty', () => {
    component.jornales = [mkJornal()];
    component.busqueda = '';
    expect(component.filtrados.length).toBe(1);
  });

  it('filtrados should filter by nombreCultivo', () => {
    component.jornales = [mkJornal()];
    component.busqueda = 'maiz';
    expect(component.filtrados.length).toBe(1);
    component.busqueda = 'zzz';
    expect(component.filtrados.length).toBe(0);
  });

  it('totalJornales should sum valorJornal', () => {
    component.jornales = [mkJornal()];
    expect(component.totalJornales).toBe(50000);
  });

  it('pendientes should count unliquidated jornales', () => {
    component.jornales = [mkJornal(false)];
    expect(component.pendientes).toBe(1);
  });

  it('totalPendiente should sum valorJornal of unliquidated jornales', () => {
    component.jornales = [mkJornal(false)];
    expect(component.totalPendiente).toBe(50000);
  });

  it('filtrarFechas() should call cargarJornales', () => {
    component.trabajadorId = 1;
    jornalSvc.porTrabajador.mockClear();
    component.filtrarFechas();
    expect(jornalSvc.porTrabajador).toHaveBeenCalled();
  });

  it('limpiarFiltros() should reset dates and reload', () => {
    component.trabajadorId = 1;
    component.fechaInicio = '2024-01-01';
    component.fechaFin    = '2024-01-31';
    jornalSvc.porTrabajador.mockClear();
    component.limpiarFiltros();
    expect(component.fechaInicio).toBe('');
    expect(component.fechaFin).toBe('');
    expect(jornalSvc.porTrabajador).toHaveBeenCalled();
  });

  it('abrirGenerarNomina() should open panel and reset form when no pendientes', () => {
    component.jornales = [mkJornal(true)];
    component.abrirGenerarNomina();
    expect(component.panelNomina).toBe(true);
  });

  it('abrirGenerarNomina() should prefill dates from pending jornales', () => {
    component.jornales = [mkJornal(false)];
    component.abrirGenerarNomina();
    expect(component.formNomina.value.periodoInicio).toBe('2024-01-10');
    expect(component.formNomina.value.periodoFin).toBe('2024-01-10');
  });

  it('cerrarPanel() should close panel', () => {
    component.panelNomina = true;
    component.cerrarPanel();
    expect(component.panelNomina).toBe(false);
    expect(component.nominaGenerada).toBeNull();
  });

  it('generarNomina() should not call service when form invalid', () => {
    component.abrirGenerarNomina();
    component.formNomina.reset();
    component.generarNomina();
    expect(nominaSvc.generar).not.toHaveBeenCalled();
  });

  it('generarNomina() should not call service without trabajadorId', () => {
    component.trabajadorId = null;
    component.abrirGenerarNomina();
    component.formNomina.setValue({ periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.generarNomina();
    expect(nominaSvc.generar).not.toHaveBeenCalled();
  });

  it('generarNomina() should set error when periodoFin < periodoInicio', () => {
    component.trabajadorId = 1;
    component.abrirGenerarNomina();
    component.formNomina.setValue({ periodoInicio: '2024-01-31', periodoFin: '2024-01-01' });
    component.generarNomina();
    expect(component.error).toContain('fecha fin');
    expect(nominaSvc.generar).not.toHaveBeenCalled();
  });

  it('generarNomina() should call generar and set nominaGenerada on success', () => {
    nominaSvc.generar.mockReturnValue(of(mkNomina()));
    component.trabajadorId = 1;
    jornalSvc.porTrabajador.mockReturnValue(of([]));
    component.abrirGenerarNomina();
    component.formNomina.setValue({ periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.generarNomina();
    expect(component.nominaGenerada).toBeTruthy();
  });

  it('generarNomina() should set error on failure', () => {
    nominaSvc.generar.mockReturnValue(throwError(() => new Error()));
    component.trabajadorId = 1;
    component.abrirGenerarNomina();
    component.formNomina.setValue({ periodoInicio: '2024-01-01', periodoFin: '2024-01-31' });
    component.generarNomina();
    expect(component.error).toContain('Error al generar');
  });

  it('verNominaCompleta() should navigate to nominas', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.trabajadorId = 1;
    component.verNominaCompleta();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/worker/nominas'],
      expect.objectContaining({ queryParams: { trabajadorId: 1 } })
    );
  });

  it('verNominaCompleta() should do nothing without trabajadorId', () => {
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate');
    component.trabajadorId = null;
    component.verNominaCompleta();
    expect(spy).not.toHaveBeenCalled();
  });

  it('irANuevoJornal() should navigate with trabajadorId', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.trabajadorId = 1;
    component.irANuevoJornal();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/worker/jornales/nuevo'],
      { queryParams: { trabajadorId: 1 } }
    );
  });

  it('irANuevoJornal() should navigate without queryParams when no trabajadorId', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.trabajadorId = null;
    component.irANuevoJornal();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/worker/jornales/nuevo'],
      { queryParams: {} }
    );
  });

  it('volver() should navigate to /worker', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/worker']);
  });

  it('invalido() should return true when field is invalid and touched', () => {
    component.formNomina.get('periodoInicio')!.setValue('');
    component.formNomina.get('periodoInicio')!.markAsTouched();
    expect(component.invalido('periodoInicio')).toBe(true);
  });
});
