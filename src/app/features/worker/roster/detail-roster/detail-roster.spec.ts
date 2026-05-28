import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetalleNominaComponent } from './detail-roster';
import { NominaService, PagoService } from '../../../../core/services/worker.service';
import { vi } from 'vitest';

const mkNomina = (estado = 'PENDIENTE', id = 1): any => ({
  id, trabajadorId: 1, valorTotal: 100000, estado
});
const mkPago = (): any => ({ id: 1, nominaId: 1, monto: 100000 });

describe('DetalleNominaComponent', () => {
  let component: DetalleNominaComponent;
  let fixture:   ComponentFixture<DetalleNominaComponent>;
  let nominaSvc: any;
  let pagoSvc:   any;

  async function createComponent(paramId = '1') {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DetalleNominaComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: NominaService, useValue: nominaSvc },
        { provide: PagoService,   useValue: pagoSvc },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => paramId } } }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(DetalleNominaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    nominaSvc = {
      obtener: vi.fn(),
      aprobar: vi.fn(),
      anular:  vi.fn()
    };
    pagoSvc = {
      listarTodos: vi.fn(),
      registrar:   vi.fn()
    };
  });

  it('should create', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load nomina and set cargando false', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    expect(component.nomina).toBeTruthy();
    expect(component.cargando).toBe(false);
  });

  it('ngOnInit() should load pagos when nomina is APROBADA', async () => {
    pagoSvc.listarTodos.mockReturnValue(of([mkPago()]));
    nominaSvc.obtener.mockReturnValue(of(mkNomina('APROBADA')));
    await createComponent();
    expect(pagoSvc.listarTodos).toHaveBeenCalled();
    expect(component.pagos.length).toBe(1);
  });

  it('ngOnInit() should set error on load failure', async () => {
    nominaSvc.obtener.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    expect(component.error).toContain('Error al cargar');
    expect(component.cargando).toBe(false);
  });

  it('aprobar() should do nothing when nomina is null', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    component.nomina = null;
    component.aprobar();
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should do nothing when confirm is false', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createComponent();
    component.aprobar();
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should approve and register pago on success', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.aprobar.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(of(mkPago()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.useFakeTimers();
    await createComponent();
    component.aprobar();
    expect(pagoSvc.registrar).toHaveBeenCalled();
    expect(component.pagos.length).toBe(1);
    expect(component.exito).toContain('Nómina aprobada');
    vi.advanceTimersByTime(4000);
    expect(component.exito).toBe('');
    vi.useRealTimers();
  });

  it('aprobar() should set error when pago fails after approval', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.aprobar.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.aprobar();
    expect(component.error).toContain('error al registrar el pago');
  });

  it('aprobar() should set error when aprobar fails', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.aprobar.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.aprobar();
    expect(component.error).toContain('Error al aprobar');
    expect(component.guardando).toBe(false);
  });

  it('anular() should do nothing when nomina is null', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    component.nomina = null;
    component.anular();
    expect(nominaSvc.anular).not.toHaveBeenCalled();
  });

  it('anular() should do nothing when confirm is false', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createComponent();
    component.anular();
    expect(nominaSvc.anular).not.toHaveBeenCalled();
  });

  it('anular() should reload nomina on success', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.anular.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.anular();
    expect(nominaSvc.obtener).toHaveBeenCalledTimes(2);
  });

  it('anular() should set error on failure', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.anular.mockReturnValue(throwError(() => new Error()));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createComponent();
    component.anular();
    expect(component.error).toContain('Error al anular');
    expect(component.guardando).toBe(false);
  });

  it('verPago() should navigate to /worker/pagos', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.verPago();
    expect(router.navigate).toHaveBeenCalledWith(['/worker/pagos'], expect.any(Object));
  });

  it('estadoClass() should return correct badge class', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    expect(component.estadoClass('PENDIENTE')).toBe('badge-borrador');
    expect(component.estadoClass('APROBADA')).toBe('badge-activo');
    expect(component.estadoClass('PAGADA')).toBe('badge-pagada');
    expect(component.estadoClass('ANULADA')).toBe('badge-inactivo');
    expect(component.estadoClass('OTRO')).toBe('');
  });
});
