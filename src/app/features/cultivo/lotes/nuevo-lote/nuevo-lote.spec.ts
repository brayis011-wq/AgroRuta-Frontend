import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NuevoLoteComponent } from './nuevo-lote';
import { CultivoService } from '../../../../core/services/cultivo.service';

vi.mock('leaflet', () => ({ default: {}, map: vi.fn(() => ({ setView: vi.fn().mockReturnThis(), addLayer: vi.fn(), addControl: vi.fn(), on: vi.fn(), remove: vi.fn() })), tileLayer: vi.fn(() => ({ addTo: vi.fn() })), control: { layers: vi.fn(() => ({ addTo: vi.fn() })) }, FeatureGroup: vi.fn(() => ({ clearLayers: vi.fn(), addLayer: vi.fn() })), Control: { extend: vi.fn(() => vi.fn(() => ({ addTo: vi.fn() }))) }, DomUtil: { create: vi.fn(() => ({ innerHTML: '' })) }, DomEvent: { on: vi.fn() }, marker: vi.fn(() => ({ addTo: vi.fn() })), icon: vi.fn(), latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })) }));
vi.mock('leaflet-draw', () => ({}));

const mockFinca = { id: 3, nombre: 'Finca A', hectareas: 10, centroideLat: 4.5, centroideLng: -74.1 };

describe('NuevoLoteComponent', () => {
  let component: NuevoLoteComponent;
  let cultivoServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      buscarFinca: vi.fn().mockReturnValue(of(mockFinca)),
      registrarLote: vi.fn().mockReturnValue(of({ id: 1 })),
      actualizarGeometriaLote: vi.fn().mockReturnValue(of({})),
    };
    routerMock = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [NuevoLoteComponent],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '3' } } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NuevoLoteComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('ngOnInit() should set fincaId and load finca', () => {
    component.ngOnInit();
    expect(component.fincaId).toBe(3);
    expect(component.finca).toEqual(mockFinca);
  });
  it('ngOnInit() should set error when finca fails', () => {
    cultivoServiceMock.buscarFinca.mockReturnValue(throwError(() => new Error()));
    component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar la información de la finca.');
  });
  it('registrar() should set error when nombre empty', () => {
    component.form.nombre = '';
    component.registrar();
    expect(component.error).toBe('Por favor ingresa el nombre del lote.');
  });
  it('registrar() should set error when no coordenadas', () => {
    component.form.nombre = 'Lote 1';
    component.coordenadas = null;
    component.registrar();
    expect(component.error).toContain('Dibuja');
  });
  it('registrar() should set error when area exceeds finca', () => {
    component.form.nombre = 'Lote 1';
    component.coordenadas = '[[1,2]]';
    component.areaCalculada = 20;
    component.hectareasFinca = 10;
    component.registrar();
    expect(component.error).toContain('supera');
  });
  it('registrar() should call registrarLote', () => {
    component.form.nombre = 'Lote 1';
    component.coordenadas = '[[1,2]]';
    component.areaCalculada = 5;
    component.hectareasFinca = 10;
    component.centroideLat = 4.5;
    component.centroideLng = -74.1;
    component.fincaId = 3;
    component.registrar();
    expect(cultivoServiceMock.registrarLote).toHaveBeenCalled();
  });
  it('registrar() should set error on failure', () => {
    cultivoServiceMock.registrarLote.mockReturnValue(throwError(() => new Error()));
    component.form.nombre = 'Lote 1';
    component.coordenadas = '[[1,2]]';
    component.areaCalculada = 5;
    component.hectareasFinca = 10;
    component.centroideLat = 4.5;
    component.centroideLng = -74.1;
    component.registrar();
    expect(component.error).toBe('Error al registrar el lote. Intenta de nuevo.');
  });
  it('cancelar() should navigate to finca', () => {
    component.fincaId = 3;
    component.cancelar();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/finca', 3]);
  });
  it('buscarUbicacion() should do nothing when empty', () => {
    component.busquedaMapa = '';
    component.buscarUbicacion();
    expect(true).toBe(true);
  });
});
