// src/app/features/cultivo/fincas/lista-fincas/lista-fincas.spec.ts
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ListaFincasComponent } from './lista-fincas';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';

// ── Mock completo de Leaflet ─────────────────────────────────
vi.mock('leaflet', () => {
  const marcadorMock = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    openPopup: vi.fn(),
    _icon: null,
  };
  const mapasMock = {
    setView: vi.fn().mockReturnThis(),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
  };
  const featureGroupMock = {
    getBounds: vi.fn().mockReturnValue({}),
  };
  const tileMock = { addTo: vi.fn().mockReturnThis() };
  const controlLayersMock = { addTo: vi.fn().mockReturnThis() };

  return {
    default: {
      map: vi.fn().mockReturnValue(mapasMock),
      tileLayer: vi.fn().mockReturnValue(tileMock),
      marker: vi.fn().mockReturnValue(marcadorMock),
      divIcon: vi.fn().mockReturnValue({}),
      featureGroup: vi.fn().mockReturnValue(featureGroupMock),
      control: { layers: vi.fn().mockReturnValue(controlLayersMock) },
    },
    map: vi.fn().mockReturnValue(mapasMock),
    tileLayer: vi.fn().mockReturnValue(tileMock),
    marker: vi.fn().mockReturnValue(marcadorMock),
    divIcon: vi.fn().mockReturnValue({}),
    featureGroup: vi.fn().mockReturnValue(featureGroupMock),
    control: { layers: vi.fn().mockReturnValue(controlLayersMock) },
  };
});

describe('ListaFincasComponent', () => {
  let component: ListaFincasComponent;
  let fixture: ComponentFixture<ListaFincasComponent>;
  let cultivoServiceMock: any;
  let authServiceMock: any;
  let router: Router;

  const mockUsuario: any = { id: 1, nombre: 'Juan' };
  const mockFincas: any[] = [
    { id: 1, nombre: 'Finca A', hectareas: 10, centroideLat: 4.5, centroideLng: -74.1, ubicacion: 'Bogotá' },
    { id: 2, nombre: 'Finca B', hectareas: 5,  centroideLat: null, centroideLng: null, ubicacion: 'Medellín' },
  ];

  beforeEach(async () => {
    cultivoServiceMock = {
      listarFincasPorAgricultor: vi.fn().mockReturnValue(of(mockFincas)),
      eliminarFinca: vi.fn().mockReturnValue(of(null)),
    };
    authServiceMock = {
      getUsuario: vi.fn().mockReturnValue(mockUsuario),
    };

    await TestBed.configureTestingModule({
      imports: [ListaFincasComponent],
      providers: [
        provideRouter([]),
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: AuthService,    useValue: authServiceMock    },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ListaFincasComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load fincas for logged user', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.fincas).toEqual(mockFincas);
    expect(component.cargando).toBe(false);
  });

  it('ngOnInit() should set error when no usuario', async () => {
    authServiceMock.getUsuario.mockReturnValue(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error).toBe('No se encontró el usuario. Por favor inicia sesión de nuevo.');
    expect(component.cargando).toBe(false);
  });

  it('ngOnInit() should set error on service failure', async () => {
    cultivoServiceMock.listarFincasPorAgricultor.mockReturnValue(throwError(() => new Error()));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error).toBe('Error al cargar las fincas.');
    expect(component.cargando).toBe(false);
  });

  it('fincasSinUbicacion() should count fincas without coordinates', () => {
    component.fincas = mockFincas;
    expect(component.fincasSinUbicacion()).toBe(1);
  });

  it('totalHectareas() should sum all hectareas', () => {
    component.fincas = mockFincas;
    expect(component.totalHectareas()).toBe(15);
  });

  it('totalHectareas() should handle undefined hectareas', () => {
    component.fincas = [{ id: 1, nombre: 'Sin ha' }] as any;
    expect(component.totalHectareas()).toBe(0);
  });

  it('promedioHectareas() should return average hectareas', () => {
    component.fincas = mockFincas;
    expect(component.promedioHectareas()).toBe(7.5);
  });

  it('promedioHectareas() should return 0 when no fincas', () => {
    component.fincas = [];
    expect(component.promedioHectareas()).toBe(0);
  });

  it('entrarFinca() should navigate to finca detail', () => {
    vi.spyOn(router, 'navigate');
    component.entrarFinca(1);
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo/finca', 1]);
  });

  it('nuevaFinca() should navigate to nueva-finca', () => {
    vi.spyOn(router, 'navigate');
    component.nuevaFinca();
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo/nueva-finca']);
  });

  it('iniciarEliminacion() should set fincaAEliminar', () => {
    const event = { stopPropagation: vi.fn() } as any;
    component.iniciarEliminacion(event, mockFincas[0]);
    expect(component.fincaAEliminar).toEqual(mockFincas[0]);
    expect(component.textoConfirmacion).toBe('');
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('cancelarEliminacion() should clear fincaAEliminar', () => {
    component.fincaAEliminar = mockFincas[0];
    component.cancelarEliminacion();
    expect(component.fincaAEliminar).toBeNull();
    expect(component.textoConfirmacion).toBe('');
  });

  it('confirmarEliminacion() should do nothing if texto is not "confirmar"', () => {
    component.fincaAEliminar = mockFincas[0];
    component.textoConfirmacion = 'otro';
    component.confirmarEliminacion();
    expect(cultivoServiceMock.eliminarFinca).not.toHaveBeenCalled();
  });

  it('confirmarEliminacion() should eliminate finca on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.fincas = [...mockFincas];
    component.fincaAEliminar = mockFincas[0];
    component.textoConfirmacion = 'confirmar';
    component.confirmarEliminacion();
    await fixture.whenStable();
    expect(cultivoServiceMock.eliminarFinca).toHaveBeenCalledWith(1);
    expect(component.fincaAEliminar).toBeNull();
  });

  it('confirmarEliminacion() should set error on failure', async () => {
    cultivoServiceMock.eliminarFinca.mockReturnValue(throwError(() => new Error()));
    component.fincas = [...mockFincas];
    component.fincaAEliminar = mockFincas[0];
    component.textoConfirmacion = 'confirmar';
    component.confirmarEliminacion();
    await fixture.whenStable();
    expect(component.error).toBe('Error al eliminar la finca.');
  });

  it('resaltarFinca() should set fincaResaltada', () => {
    component.resaltarFinca(mockFincas[0]);
    expect(component.fincaResaltada).toBe(1);
  });

  it('quitarResaltado() should clear fincaResaltada', () => {
    component.fincaResaltada = 1;
    component.quitarResaltado();
    expect(component.fincaResaltada).toBeNull();
  });
});
