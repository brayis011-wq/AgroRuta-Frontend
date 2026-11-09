// src/app/features/crop/plots/plot-detail/plot-detail.spec.ts
import { vi } from 'vitest';

vi.mock('leaflet', () => {
  const poligonoMock = {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({}),
  };
  const ndviLayerMock = { addTo: vi.fn().mockReturnThis() };
  const mapaMock = {
    setView: vi.fn().mockReturnThis(),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    fitBounds: vi.fn(),
  };
  const tileMock = { addTo: vi.fn().mockReturnThis() };
  const controlLayersMock = { addTo: vi.fn().mockReturnThis() };
  const wms = vi.fn().mockReturnValue(ndviLayerMock);
  const tileLayer = vi.fn().mockReturnValue(tileMock);
  (tileLayer as any).wms = wms;

  return {
    default: {
      map: vi.fn().mockReturnValue(mapaMock),
      tileLayer,
      polygon: vi.fn().mockReturnValue(poligonoMock),
      control: { layers: vi.fn().mockReturnValue(controlLayersMock) },
    },
    map: vi.fn().mockReturnValue(mapaMock),
    tileLayer,
    polygon: vi.fn().mockReturnValue(poligonoMock),
    control: { layers: vi.fn().mockReturnValue(controlLayersMock) },
  };
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FincaActivaService } from '../../../../core/services/active-farm.service';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetalleLoteComponent } from './plot-detail';
import { CultivoService } from '../../../../core/services/crop.service';

describe('DetalleLoteComponent', () => {
  let component: DetalleLoteComponent;
  let fixture: ComponentFixture<DetalleLoteComponent>;
  let cultivoServiceMock: any;
  let confirmMock: { preguntar: ReturnType<typeof vi.fn> };
  let router: Router;

  const mockLote: any = {
    id: 1, nombre: 'Lote A', fincaId: 10, estado: 'EN_CULTIVO',
    coordenadas: '[[4.5,-74.1],[4.6,-74.2],[4.5,-74.2]]',
    area: 5,
  };
  const activa: any = { id: 3, loteId: 1, estadoCultivo: 'CRECIMIENTO', fechaSiembra: '2026-01-01', variedad: 'Castillo', tipoCultivo: 'Café', cantidadPlantas: 300 };
  const pasada: any = { id: 2, loteId: 1, estadoCultivo: 'FINALIZADO', fechaSiembra: '2025-01-01', fechaFin: '2025-08-20', variedad: 'Colombia', tipoCultivo: 'Uchuva', cantidadPlantas: 200 };

  beforeEach(async () => {
    cultivoServiceMock = {
      buscarLote:        vi.fn().mockReturnValue(of(mockLote)),
      historialLote:     vi.fn().mockReturnValue(of([activa, pasada])),
      totalKgCosechado:  vi.fn().mockReturnValue(of(845.5)),
      etapasSiembra:     vi.fn().mockReturnValue(of([])),
      cambiarEstadoLote: vi.fn().mockReturnValue(of({ ...mockLote, estado: 'EN_DESCANSO' })),
      actualizarLote:    vi.fn().mockReturnValue(of({ ...mockLote, nombre: 'Lote Norte', area: 6 })),
    };
    confirmMock = { preguntar: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DetalleLoteComponent],
      providers: [
        provideRouter([]),
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: FincaActivaService, useValue: { refrescarLotes: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue('1') } } },
        },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(DetalleLoteComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
  });

  afterEach(() => vi.restoreAllMocks());

  it('separa la siembra en curso de las temporadas anteriores', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.lote()).toEqual(mockLote);
    expect(component.siembra()?.id).toBe(3);
    expect(component.temporadas().map(t => t.siembra.id)).toEqual([2]);
    expect(component.temporadas()[0].dias).toBe(231);
    expect(component.temporadas()[0].kg).toBe(845.5);
    expect(component.cargando()).toBe(false);
  });

  it('sin siembra en curso muestra el botón de nueva temporada', async () => {
    cultivoServiceMock.historialLote.mockReturnValue(of([pasada]));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.siembra()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('temporadas.lote.newSeason');
  });

  it('muestra error si el lote no carga', async () => {
    cultivoServiceMock.buscarLote.mockReturnValue(throwError(() => new Error()));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error()).toBe('lotes.detail.errors.load');
    expect(component.cargando()).toBe(false);
  });

  it('pone el lote en descanso después de confirmar', async () => {
    fixture.detectChanges();
    await component.cambiarEstado('EN_DESCANSO');
    expect(confirmMock.preguntar).toHaveBeenCalled();
    expect(cultivoServiceMock.cambiarEstadoLote).toHaveBeenCalledWith(1, 'EN_DESCANSO');
    expect(component.lote()?.estado).toBe('EN_DESCANSO');
  });

  it('no cambia el estado si el usuario cancela', async () => {
    confirmMock.preguntar.mockResolvedValue(false);
    fixture.detectChanges();
    await component.cambiarEstado('EN_DESCANSO');
    expect(cultivoServiceMock.cambiarEstadoLote).not.toHaveBeenCalled();
  });

  it('guarda el nombre y el área editados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.editar();
    component.formNombre = ' Lote Norte ';
    component.formArea = 6;
    component.guardarLote();
    expect(cultivoServiceMock.actualizarLote).toHaveBeenCalledWith(1, { nombre: 'Lote Norte', area: 6, fincaId: 10 });
    expect(component.lote()?.nombre).toBe('Lote Norte');
    expect(component.editando()).toBe(false);
  });

  it('al cerrar la temporada recarga el lote y el historial', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    cultivoServiceMock.historialLote.mockClear();
    component.alCambiarSiembra({ ...activa, estadoCultivo: 'FINALIZADO', fechaFin: '2026-06-01' });
    expect(cultivoServiceMock.buscarLote).toHaveBeenCalledTimes(2);
    expect(cultivoServiceMock.historialLote).toHaveBeenCalledTimes(1);
  });

  it('nuevaSiembra() va al formulario del lote', async () => {
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    component.nuevaSiembra();
    expect(nav).toHaveBeenCalledWith(['/crops/farm', 10, 'plot', 1, 'new-planting']);
  });
});
