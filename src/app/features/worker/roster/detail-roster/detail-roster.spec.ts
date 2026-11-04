import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetalleNominaComponent } from './detail-roster';
import { NominaService, PagoService } from '../../../../core/services/worker.service';
import { vi } from 'vitest';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';

const mkNomina = (estado = 'PENDIENTE', id = 1): any => ({
  id, trabajadorId: 1, valorTotal: 100000, estado
});
const mkPago = (): any => ({ id: 1, nominaId: 1, monto: 100000 });

describe('DetalleNominaComponent', () => {
  let component: DetalleNominaComponent;
  let fixture:   ComponentFixture<DetalleNominaComponent>;
  let nominaSvc: any;
  let pagoSvc:   any;

  // El diálogo de confirmación responde lo que diga cada prueba
  let respuesta = true;
  const confirmSvc = { preguntar: vi.fn(() => Promise.resolve(respuesta)) };

  async function createComponent(paramId = '1') {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DetalleNominaComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ConfirmService, useValue: confirmSvc },
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
    respuesta = true;
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

  it('ngOnInit() should load pagos when nomina is PAGADA', async () => {
    pagoSvc.listarTodos.mockReturnValue(of([mkPago()]));
    nominaSvc.obtener.mockReturnValue(of(mkNomina('PAGADA')));
    await createComponent();
    expect(pagoSvc.listarTodos).toHaveBeenCalled();
    expect(component.pagos.length).toBe(1);
  });

  it('ngOnInit() should not load pagos when nomina is APROBADA (not paid yet)', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina('APROBADA')));
    await createComponent();
    expect(pagoSvc.listarTodos).not.toHaveBeenCalled();
  });

  it('ngOnInit() should set error on load failure', async () => {
    nominaSvc.obtener.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    expect(component.error).toBe('workers.rosters.detail.errors.load');
    expect(component.cargando).toBe(false);
  });

  it('aprobar() should do nothing when nomina is null', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    component.nomina = null;
    await component.aprobar();
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should do nothing when confirm is false', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    respuesta = false;
    await createComponent();
    await component.aprobar();
    expect(nominaSvc.aprobar).not.toHaveBeenCalled();
  });

  it('aprobar() should only approve and open the payment form', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.aprobar.mockReturnValue(of(mkNomina('APROBADA')));
    respuesta = true;
    vi.useFakeTimers();
    await createComponent();
    await component.aprobar();
    expect(pagoSvc.registrar).not.toHaveBeenCalled();
    expect(component.nomina!.estado).toBe('APROBADA');
    expect(component.mostrarFormPago).toBe(true);
    expect(component.exito).toBe('workers.rosters.detail.success.approved');
    vi.advanceTimersByTime(4000);
    expect(component.exito).toBe('');
    vi.useRealTimers();
  });

  it('aprobar() should set error when aprobar fails', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.aprobar.mockReturnValue(throwError(() => new Error()));
    respuesta = true;
    await createComponent();
    await component.aprobar();
    expect(component.error).toBe('workers.rosters.detail.errors.approve');
    expect(component.guardando).toBe(false);
  });

  it('registrarPago() should send the full amount with the chosen method', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(of(mkPago()));
    await createComponent();
    component.abrirFormPago();
    component.pagoForm.patchValue({ metodoPago: 'TRANSFERENCIA', comprobante: ' TRX-9 ' });
    component.registrarPago();
    expect(pagoSvc.registrar).toHaveBeenCalledWith({
      nominaId: 1,
      monto: 100000,
      metodoPago: 'TRANSFERENCIA',
      comprobante: 'TRX-9',
      observaciones: undefined
    });
    expect(component.pagos.length).toBe(1);
    expect(component.mostrarFormPago).toBe(false);
    expect(component.exito).toBe('workers.rosters.detail.success.paid');
    expect(nominaSvc.obtener).toHaveBeenCalledTimes(2);
  });

  it('registrarPago() should not call the service when the method is empty', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina('APROBADA')));
    await createComponent();
    component.pagoForm.patchValue({ metodoPago: '' });
    component.registrarPago();
    expect(pagoSvc.registrar).not.toHaveBeenCalled();
  });

  it('registrarPago() should show the backend message on failure', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(
      throwError(() => ({ error: { message: 'Esta nómina ya tiene un pago registrado.' } })));
    await createComponent();
    component.registrarPago();
    expect(component.error).toBe('Esta nómina ya tiene un pago registrado.');
    expect(component.guardando).toBe(false);
  });

  it('registrarPago() should fall back to a generic error key', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina('APROBADA')));
    pagoSvc.registrar.mockReturnValue(throwError(() => new Error()));
    await createComponent();
    component.registrarPago();
    expect(component.error).toBe('workers.rosters.detail.errors.payment');
  });

  it('anular() should do nothing when nomina is null', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    await createComponent();
    component.nomina = null;
    await component.anular();
    expect(nominaSvc.anular).not.toHaveBeenCalled();
  });

  it('anular() should do nothing when confirm is false', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    respuesta = false;
    await createComponent();
    await component.anular();
    expect(nominaSvc.anular).not.toHaveBeenCalled();
  });

  it('anular() should reload nomina on success', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.anular.mockReturnValue(of(undefined));
    respuesta = true;
    await createComponent();
    await component.anular();
    expect(nominaSvc.obtener).toHaveBeenCalledTimes(2);
  });

  it('anular() should set error on failure', async () => {
    nominaSvc.obtener.mockReturnValue(of(mkNomina()));
    nominaSvc.anular.mockReturnValue(throwError(() => new Error()));
    respuesta = true;
    await createComponent();
    await component.anular();
    expect(component.error).toBe('workers.rosters.detail.errors.cancel');
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
