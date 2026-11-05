import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DetalleFincaComponent } from './detalle-finca';
import { Finca, Lote } from '../../../../core/models/cultivo.model';
import { FincaActivaService } from '../../../../core/services/finca-activa.service';

describe('DetalleFincaComponent', () => {
  let component: DetalleFincaComponent;
  let cultivoServiceMock: any;
  let routerMock: any;
  let routeMock: any;
  let cdrMock: any;

  const fincaMock: Finca = { id: 1, nombre: 'Finca El Rosal', ubicacion: 'Huila', hectareas: 10, agricultorId: 101 };
  const lotesMock: Lote[] = [
    { id: 10, nombre: 'Lote A', estado: 'DISPONIBLE', fincaId: 1, area: 5 },
    { id: 11, nombre: 'Lote B', estado: 'EN_CULTIVO',  fincaId: 1, area: 4 },
  ];

  beforeEach(() => {
    cultivoServiceMock = {
      buscarFinca:         vi.fn().mockReturnValue(of(fincaMock)),
      listarLotesPorFinca: vi.fn().mockReturnValue(of(lotesMock)),
      eliminarLote:        vi.fn().mockReturnValue(of(void 0)),
      buscarSiembraPorLote: vi.fn().mockReturnValue(of(null)),
    };

    routerMock = { navigate: vi.fn() };
    routeMock  = { snapshot: { paramMap: { get: () => '1' } } };
    cdrMock    = { detectChanges: vi.fn() };

    // La pantalla pide algunos servicios con inject(): se crea dentro del contexto de Angular
    TestBed.configureTestingModule({ providers: [{ provide: FincaActivaService, useValue: { cargar: vi.fn() } }] });
    component = TestBed.runInInjectionContext(
      () => new DetalleFincaComponent(routeMock, routerMock, cultivoServiceMock, cdrMock));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit carga finca y lotes correctamente', () => {
    component.ngOnInit();

    expect(cultivoServiceMock.buscarFinca).toHaveBeenCalledWith(1);
    expect(cultivoServiceMock.listarLotesPorFinca).toHaveBeenCalledWith(1);
    expect(component.finca).toEqual(fincaMock);
    expect(component.lotes).toEqual(lotesMock);
    expect(component.cargando).toBe(false);
  });

  it('ngOnInit muestra error si buscarFinca falla', () => {
    cultivoServiceMock.buscarFinca = vi.fn().mockReturnValue(throwError(() => new Error()));

    component.ngOnInit();

    expect(component.error).toBe('cultivo.fincas.detail.errors.loadFarm');
    expect(component.cargando).toBe(false);
  });

  it('cargarLotes muestra error si el servicio falla', () => {
    cultivoServiceMock.listarLotesPorFinca = vi.fn().mockReturnValue(throwError(() => new Error()));

    component.cargarLotes(1);

    expect(component.error).toBe('cultivo.fincas.detail.errors.loadLots');
    expect(component.cargando).toBe(false);
  });

  it('getEstadoColor retorna la clase correcta', () => {
    expect(component.getEstadoColor('DISPONIBLE')).toBe('estado-disponible');
    expect(component.getEstadoColor('EN_CULTIVO')).toBe('estado-cultivo');
    expect(component.getEstadoColor('EN_DESCANSO')).toBe('estado-descanso');
    expect(component.getEstadoColor('OTRO')).toBe('');
  });

  it('getEstadoLabel retorna la etiqueta correcta', () => {
    expect(component.getEstadoLabel('DISPONIBLE')).toBe('enums.loteEstado.DISPONIBLE');
    expect(component.getEstadoLabel('EN_CULTIVO')).toBe('enums.loteEstado.EN_CULTIVO');
    expect(component.getEstadoLabel('EN_DESCANSO')).toBe('enums.loteEstado.EN_DESCANSO');
    expect(component.getEstadoLabel('OTRO')).toBe('enums.loteEstado.OTRO');
  });

  it('entrarLote navega a la ruta del lote', () => {
    component.entrarLote(10);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/lote', 10]);
  });

  it('nuevoLote navega a la ruta correcta', () => {
    component.fincaId = 1;
    component.nuevoLote();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/finca', 1, 'nuevo-lote']);
  });

  it('volver navega a /cultivo', () => {
    component.volver();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo']);
  });

  it('iniciarEliminacionLote asigna el lote y limpia el texto', () => {
    const evento = new MouseEvent('click');
    vi.spyOn(evento, 'stopPropagation');

    component.iniciarEliminacionLote(evento, lotesMock[0]);

    expect(evento.stopPropagation).toHaveBeenCalled();
    expect(component.loteAEliminar).toEqual(lotesMock[0]);
    expect(component.textoConfirmacion).toBe('');
  });

  it('cancelarEliminacion limpia el lote y el texto', () => {
    component.loteAEliminar     = lotesMock[0];
    component.textoConfirmacion = component.palabraConfirmacion;

    component.cancelarEliminacion();

    expect(component.loteAEliminar).toBeNull();
    expect(component.textoConfirmacion).toBe('');
  });

  it('confirmarEliminacionLote no actúa si el texto es incorrecto', () => {
    component.loteAEliminar     = lotesMock[0];
    component.textoConfirmacion = 'mal escrito';

    component.confirmarEliminacionLote();

    expect(cultivoServiceMock.eliminarLote).not.toHaveBeenCalled();
  });

  it('confirmarEliminacionLote elimina el lote de la lista', () => {
    component.lotes             = [...lotesMock];
    component.loteAEliminar     = lotesMock[0];
    component.textoConfirmacion = component.palabraConfirmacion;

    component.confirmarEliminacionLote();

    expect(cultivoServiceMock.eliminarLote).toHaveBeenCalledWith(10);
    expect(component.lotes.length).toBe(1);
    expect(component.lotes[0].id).toBe(11);
    expect(component.loteAEliminar).toBeNull();
    expect(component.eliminando).toBe(false);
  });

  it('confirmarEliminacionLote muestra error si el servicio falla', () => {
    cultivoServiceMock.eliminarLote = vi.fn().mockReturnValue(throwError(() => new Error()));
    component.lotes             = [...lotesMock];
    component.loteAEliminar     = lotesMock[0];
    component.textoConfirmacion = component.palabraConfirmacion;

    component.confirmarEliminacionLote();

    expect(component.error).toBe('cultivo.fincas.detail.errors.deleteLot');
    expect(component.eliminando).toBe(false);
  });
});
