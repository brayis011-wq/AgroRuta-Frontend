import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DetalleFincaComponent } from './detalle-finca';
import { Finca, Lote } from '../../../../core/models/cultivo.model';

describe('DetalleFincaComponent', () => {
  let component: DetalleFincaComponent;
  let cultivoServiceMock: any;
  let routerMock: any;
  let routeMock: any;
  let cdrMock: any;

  const fincaMock: Finca = { id: 1, nombre: 'Finca El Rosal' };
  const lotesMock: Lote[] = [
    { id: 10, nombre: 'Lote A', estado: 'DISPONIBLE', fincaId: 1 },
    { id: 11, nombre: 'Lote B', estado: 'EN_CULTIVO',  fincaId: 1 },
  ];

  beforeEach(() => {
    cultivoServiceMock = {
      buscarFinca:         vi.fn().mockReturnValue(of(fincaMock)),
      listarLotesPorFinca: vi.fn().mockReturnValue(of(lotesMock)),
      eliminarLote:        vi.fn().mockReturnValue(of(void 0)),
    };

    routerMock = { navigate: vi.fn() };
    routeMock  = { snapshot: { paramMap: { get: () => '1' } } };
    cdrMock    = { detectChanges: vi.fn() };

    component = new DetalleFincaComponent(routeMock, routerMock, cultivoServiceMock, cdrMock);
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

    expect(component.error).toBe('Error al cargar la finca.');
    expect(component.cargando).toBe(false);
  });

  it('cargarLotes muestra error si el servicio falla', () => {
    cultivoServiceMock.listarLotesPorFinca = vi.fn().mockReturnValue(throwError(() => new Error()));

    component.cargarLotes(1);

    expect(component.error).toBe('Error al cargar los lotes.');
    expect(component.cargando).toBe(false);
  });

  it('getEstadoColor retorna la clase correcta', () => {
    expect(component.getEstadoColor('DISPONIBLE')).toBe('estado-disponible');
    expect(component.getEstadoColor('EN_CULTIVO')).toBe('estado-cultivo');
    expect(component.getEstadoColor('EN_DESCANSO')).toBe('estado-descanso');
    expect(component.getEstadoColor('OTRO')).toBe('');
  });

  it('getEstadoLabel retorna la etiqueta correcta', () => {
    expect(component.getEstadoLabel('DISPONIBLE')).toBe('🟢 Disponible');
    expect(component.getEstadoLabel('EN_CULTIVO')).toBe('🟡 En cultivo');
    expect(component.getEstadoLabel('EN_DESCANSO')).toBe('⚫ En descanso');
    expect(component.getEstadoLabel('OTRO')).toBe('OTRO');
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
    component.textoConfirmacion = 'confirmar';

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
    component.textoConfirmacion = 'confirmar';

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
    component.textoConfirmacion = 'confirmar';

    component.confirmarEliminacionLote();

    expect(component.error).toBe('Error al eliminar el lote.');
    expect(component.eliminando).toBe(false);
  });
});
