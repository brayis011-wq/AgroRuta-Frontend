import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NuevoJornalComponent } from './new-wage';
import { JornalService, TrabajadorService, ActividadService } from '../../../../core/services/worker.service';

const mkTrabajador = (estado = 'ACTIVO'): any => ({ id: 1, nombre: 'Juan', estado, nombreCompleto: 'Juan Perez' });
const mkActividad  = (): any => ({ id: 1, nombre: 'Riego' });
const mkJornal     = (): any => ({ id: 1, trabajadorId: 1, cultivoId: 2 });
const mkCultivo = (id: number, fincaId: number, loteNombre = 'Lote ' + id): any => ({
  id, fincaId, fincaNombre: 'Finca ' + fincaId, loteId: id, loteNombre, tipoCultivo: 'Uchuva', variedad: 'Colombia', estado: 'PRODUCCION'
});
/** Rellena el formulario con datos válidos (finca 1, cultivo 2) */
const llenar = (c: any) => {
  c.form.patchValue({ trabajadorId: 1, fincaId: 1, fecha: '2024-01-10', observaciones: '' });
  c.form.patchValue({ cultivoId: 2 });
};

describe('NuevoJornalComponent', () => {
  let component: NuevoJornalComponent;
  let fixture:   ComponentFixture<NuevoJornalComponent>;
  let jornalSvc:    any;
  let trabajadorSvc: any;
  let actividadSvc:  any;

  async function createComponent(queryParams: Record<string, string> = {}) {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [NuevoJornalComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: JornalService,     useValue: jornalSvc },
        { provide: TrabajadorService, useValue: trabajadorSvc },
        { provide: ActividadService,  useValue: actividadSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (k: string) => queryParams[k] ?? null }
            }
          }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(NuevoJornalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    jornalSvc = {
      registrar: vi.fn(),
      cultivosDisponibles: vi.fn().mockReturnValue(of([mkCultivo(2, 1), mkCultivo(3, 1), mkCultivo(4, 9)]))
    };
    trabajadorSvc = {
      listarTodos: vi.fn().mockReturnValue(of([mkTrabajador()]))
    };
    actividadSvc = {
      listar: vi.fn().mockReturnValue(of([mkActividad()]))
    };
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load only ACTIVO trabajadores', async () => {
    trabajadorSvc.listarTodos.mockReturnValue(of([mkTrabajador('ACTIVO'), mkTrabajador('SUSPENDIDO')]));
    await createComponent();
    expect(component.trabajadores.length).toBe(1);
    expect(component.trabajadores[0].estado).toBe('ACTIVO');
  });

  it('ngOnInit() should prefill trabajadorId from queryParam', async () => {
    await createComponent({ trabajadorId: '1' });
    expect(component.form.value.trabajadorId).toBe(1);
  });

  it('ngOnInit() should set error when trabajadorService fails', async () => {
    trabajadorSvc.listarTodos.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    expect(component.error).toBe('workers.wages.new.errors.loadWorkers');
  });

  it('ngOnInit() should set error when actividadService fails', async () => {
    actividadSvc.listar.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    expect(component.error).toBe('workers.wages.new.errors.loadActivities');
  });

  it('ngOnInit() should load actividades', async () => {
    await createComponent();
    expect(component.actividades.length).toBe(1);
  });

  it('toggleActividad() should add actividad to selection', async () => {
    await createComponent();
    component.toggleActividad(1);
    expect(component.actividadesSeleccionadas.has(1)).toBe(true);
  });

  it('toggleActividad() should remove actividad from selection if already selected', async () => {
    await createComponent();
    component.toggleActividad(1);
    component.toggleActividad(1);
    expect(component.actividadesSeleccionadas.has(1)).toBe(false);
  });

  it('toggleActividad() should do nothing when id is undefined', async () => {
    await createComponent();
    component.toggleActividad(undefined);
    expect(component.actividadesSeleccionadas.size).toBe(0);
  });

  it('estaSeleccionada() should return true when actividad is selected', async () => {
    await createComponent();
    component.toggleActividad(1);
    expect(component.estaSeleccionada(1)).toBe(true);
  });

  it('estaSeleccionada() should return false when id is undefined', async () => {
    await createComponent();
    expect(component.estaSeleccionada(undefined)).toBe(false);
  });

  it('guardar() should not call service when form invalid', async () => {
    await createComponent();
    component.guardar();
    expect(jornalSvc.registrar).not.toHaveBeenCalled();
  });

  it('guardar() should set error when no actividades selected', async () => {
    await createComponent();
    llenar(component);
    component.guardar();
    expect(component.error).toBe('workers.wages.new.errors.noActivity');
    expect(jornalSvc.registrar).not.toHaveBeenCalled();
  });

  it('guardar() should navigate to trabajador jornales on success with origen', async () => {
    jornalSvc.registrar.mockReturnValue(of(mkJornal()));
    await createComponent({ trabajadorId: '1' });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    llenar(component);
    component.toggleActividad(1);
    component.guardar();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/worker/jornales'],
      { queryParams: { trabajadorId: 1 } }
    );
  });

  it('guardar() should navigate to /worker on success without origen', async () => {
    jornalSvc.registrar.mockReturnValue(of(mkJornal()));
    await createComponent();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    llenar(component);
    component.toggleActividad(1);
    component.guardar();
    expect(router.navigate).toHaveBeenCalledWith(['/worker']);
  });

  it('guardar() should set error on service failure', async () => {
    jornalSvc.registrar.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    llenar(component);
    component.toggleActividad(1);
    component.guardar();
    expect(component.error).toBe('workers.wages.new.errors.register');
    expect(component.guardando).toBe(false);
  });

  it('lists each farm once and keeps the crop disabled until one is chosen', async () => {
    await createComponent();
    expect(component.fincas.map(f => f.id)).toEqual([1, 9]);
    expect(component.form.get('cultivoId')!.disabled).toBe(true);
  });

  it('choosing a farm shows only its crops', async () => {
    await createComponent();
    component.elegirFinca(1);
    expect(component.cultivosDeFinca.map(c => c.id)).toEqual([2, 3]);
    expect(component.form.get('cultivoId')!.enabled).toBe(true);
  });

  it('auto-selects the farm and crop when there is only one', async () => {
    jornalSvc.cultivosDisponibles.mockReturnValue(of([mkCultivo(7, 5)]));
    await createComponent();
    expect(component.form.get('fincaId')!.value).toBe(5);
    expect(component.form.get('cultivoId')!.value).toBe(7);
  });

  it('changing the farm drops the crop from the previous farm', async () => {
    await createComponent();
    llenar(component);
    component.elegirFinca(9);
    // La finca 9 solo tiene el cultivo 4, así que queda elegido ese
    expect(component.form.get('cultivoId')!.value).toBe(4);
    component.form.patchValue({ cultivoId: null });
    component.elegirFinca(1);
    expect(component.form.get('cultivoId')!.value).toBeNull();
  });

  it('shows no farms when the user has no active crops', async () => {
    jornalSvc.cultivosDisponibles.mockReturnValue(of([]));
    await createComponent();
    expect(component.fincas.length).toBe(0);
    expect(component.cargandoCultivos).toBe(false);
  });

  it('sends only the crop id, not a free-text name', async () => {
    jornalSvc.registrar.mockReturnValue(of(mkJornal()));
    await createComponent();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    llenar(component);
    component.toggleActividad(1);
    component.guardar();
    const req = jornalSvc.registrar.mock.calls[0][0];
    expect(req.cultivoId).toBe(2);
    expect(req.nombreCultivo).toBeUndefined();
  });

  it('shows the backend reason when the crop is rejected', async () => {
    jornalSvc.registrar.mockReturnValue(throwError(() => ({ error: { message: 'El cultivo ya está finalizado.' } })));
    await createComponent();
    llenar(component);
    component.toggleActividad(1);
    component.guardar();
    expect(component.error).toBe('El cultivo ya está finalizado.');
  });

  it('defaults the date to today', async () => {
    await createComponent();
    expect(component.form.get('fecha')!.value).toBe(component.hoy);
  });

  it('invalido() should return true when field is invalid and touched', async () => {
    await createComponent();
    component.form.get('trabajadorId')!.setValue(null);
    component.form.get('trabajadorId')!.markAsTouched();
    expect(component.invalido('trabajadorId')).toBe(true);
  });

  it('invalido() should return false when field is valid', async () => {
    await createComponent();
    component.form.get('trabajadorId')!.setValue(1);
    component.form.get('trabajadorId')!.markAsTouched();
    expect(component.invalido('trabajadorId')).toBe(false);
  });
});
