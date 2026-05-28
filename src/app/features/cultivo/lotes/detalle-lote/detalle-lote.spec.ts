// src/app/features/cultivo/lotes/detalle-lote/detalle-lote.spec.ts
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
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetalleLoteComponent } from './detalle-lote';
import { CultivoService } from '../../../../core/services/cultivo.service';

describe('DetalleLoteComponent', () => {
  let component: DetalleLoteComponent;
  let fixture: ComponentFixture<DetalleLoteComponent>;
  let cultivoServiceMock: any;
  let router: Router;

  const mockLote: any = {
    id: 1, nombre: 'Lote A', fincaId: 10,
    coordenadas: '[[4.5,-74.1],[4.6,-74.2],[4.5,-74.2]]',
    area: 5,
  };
  const mockSiembra: any = {
    id: 1, loteId: 1,
    estadoCultivo: 'CRECIMIENTO',
    fechaSiembra: '2024-01-01',
  };

  beforeEach(async () => {
    cultivoServiceMock = {
      buscarLote:           vi.fn().mockReturnValue(of(mockLote)),
      buscarSiembraPorLote: vi.fn().mockReturnValue(of(mockSiembra)),
      avanzarEtapa:         vi.fn().mockReturnValue(of({ ...mockSiembra, estadoCultivo: 'PRODUCCION' })),
    };

    await TestBed.configureTestingModule({
      imports: [DetalleLoteComponent],
      providers: [
        provideRouter([]),
        { provide: CultivoService, useValue: cultivoServiceMock },
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load lote and siembra', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.lote).toEqual(mockLote);
    expect(component.siembra).toEqual(mockSiembra);
    expect(component.cargando).toBe(false);
  });

  it('ngOnInit() should set error when lote fails', async () => {
    cultivoServiceMock.buscarLote.mockReturnValue(throwError(() => new Error()));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error).toBe('Error al cargar el lote.');
    expect(component.cargando).toBe(false);
  });

  it('cargarSiembra() should set siembra=null on error', async () => {
    cultivoServiceMock.buscarSiembraPorLote.mockReturnValue(throwError(() => new Error()));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.siembra).toBeNull();
    expect(component.cargando).toBe(false);
  });

  it('getEtapaIndex() should return correct index', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.getEtapaIndex()).toBe(1);
  });

  it('getEtapaIndex() should return -1 for unknown etapa', () => {
    component.siembra = { estadoCultivo: 'DESCONOCIDO' } as any;
    expect(component.getEtapaIndex()).toBe(-1);
  });

  it('getDiasTranscurridos() should return days since siembra', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.getDiasTranscurridos()).toBeGreaterThan(0);
  });

  it('getDiasTranscurridos() should return 0 when no fechaSiembra', () => {
    component.siembra = null;
    expect(component.getDiasTranscurridos()).toBe(0);
  });

  it('esFinalizado() should return true when estadoCultivo is FINALIZADO', () => {
    component.siembra = { estadoCultivo: 'FINALIZADO' } as any;
    expect(component.esFinalizado()).toBe(true);
  });

  it('esFinalizado() should return false when not FINALIZADO', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.esFinalizado()).toBe(false);
  });

  it('avanzarEtapa() should update siembra', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.avanzarEtapa();
    expect(component.siembra?.estadoCultivo).toBe('PRODUCCION');
    expect(component.avanzando).toBe(false);
  });

  it('avanzarEtapa() should set error on failure', async () => {
    cultivoServiceMock.avanzarEtapa.mockReturnValue(throwError(() => new Error()));
    fixture.detectChanges();
    await fixture.whenStable();
    component.avanzarEtapa();
    expect(component.error).toBe('Error al avanzar la etapa.');
    expect(component.avanzando).toBe(false);
  });

  it('avanzarEtapa() should do nothing when already avanzando', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.avanzando = true;
    component.avanzarEtapa();
    expect(cultivoServiceMock.avanzarEtapa).not.toHaveBeenCalled();
  });

  it('avanzarEtapa() should do nothing when no siembra', () => {
    component.siembra = null;
    component.avanzarEtapa();
    expect(cultivoServiceMock.avanzarEtapa).not.toHaveBeenCalled();
  });

  it('entrarSiembra() should navigate to siembra', async () => {
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
    await fixture.whenStable();
    component.entrarSiembra();
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 1]);
  });

  it('nuevaSiembra() should navigate to nueva-siembra', async () => {
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
    await fixture.whenStable();
    component.nuevaSiembra();
    expect(router.navigate).toHaveBeenCalledWith([
      '/cultivo/finca', 10, 'lote', 1, 'nueva-siembra'
    ]);
  });

  it('volver() should navigate to finca', async () => {
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
    await fixture.whenStable();
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo/finca', 10]);
  });
});
