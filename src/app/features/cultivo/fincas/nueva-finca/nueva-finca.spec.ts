import { TestBed } from '@angular/core/testing';import { NuevaFincaComponent } from './nueva-finca';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

vi.mock('leaflet', () => {
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
  };
  return {
    map: vi.fn().mockReturnValue(mapInstance),
    tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
    control: {
      layers: vi.fn().mockReturnValue({ addTo: vi.fn() }),
    },
    Control: {
      extend: vi.fn().mockReturnValue(
        class { addTo = vi.fn(); }
      ),
    },
    DomUtil: { create: vi.fn().mockReturnValue({ innerHTML: '' }) },
    DomEvent: { on: vi.fn() },
    marker: vi.fn().mockReturnValue({ addTo: vi.fn() }),
    icon: vi.fn(),
    latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
  };
});

describe('NuevaFincaComponent', () => {
  let component: NuevaFincaComponent;
  let cultivoService: {
    registrarFinca: ReturnType<typeof vi.fn>;
    actualizarCentroideFinca: ReturnType<typeof vi.fn>;
  };
  let authService: { getUsuario: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cultivoService = {
      registrarFinca: vi.fn(),
      actualizarCentroideFinca: vi.fn(),
    };
    authService = { getUsuario: vi.fn() };
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NuevaFincaComponent],
      providers: [
        { provide: CultivoService, useValue: cultivoService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NuevaFincaComponent);
    component = fixture.componentInstance;
    // Sin detectChanges para evitar ngAfterViewInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.form.nombre).toBe('');
    expect(component.form.ubicacion).toBe('');
    expect(component.form.hectareas).toBeNull();
  });

  it('guardando should default to false', () => {
    expect(component.guardando).toBe(false);
  });

  it('exito should default to false', () => {
    expect(component.exito).toBe(false);
  });

  it('registrar() should set error when form fields are incomplete', () => {
    component.registrar();
    expect(component.error).toContain('completa todos los campos');
  });

  it('registrar() should set error when map marker is missing', () => {
    component.form = { nombre: 'Finca', ubicacion: 'Bogotá', hectareas: 10 };
    component.registrar();
    expect(component.error).toContain('Marca la ubicación');
  });

  it('registrar() should set error when no user is found', () => {
    component.form = { nombre: 'Finca', ubicacion: 'Bogotá', hectareas: 10 };
    component.centroideLat = 4.5;
    component.centroideLng = -74.1;
    authService.getUsuario.mockReturnValue(null);
    component.registrar();
    expect(component.error).toContain('No se encontró el usuario');
  });

  it('registrar() should call registrarFinca with correct data', () => {
    component.form = { nombre: 'Finca', ubicacion: 'Bogotá', hectareas: 10 };
    component.centroideLat = 4.5;
    component.centroideLng = -74.1;
    authService.getUsuario.mockReturnValue({ id: '1' });
    cultivoService.registrarFinca.mockReturnValue(of({ id: '99' }));
    cultivoService.actualizarCentroideFinca.mockReturnValue(of({}));
    component.registrar();
    expect(cultivoService.registrarFinca).toHaveBeenCalledWith({
      nombre: 'Finca',
      ubicacion: 'Bogotá',
      hectareas: 10,
      agricultorId: '1',
    });
  });

  it('registrar() should set exito=true and navigate after success', async () => {
  component.form = { nombre: 'Finca', ubicacion: 'Bogotá', hectareas: 10 };
  component.centroideLat = 4.5;
  component.centroideLng = -74.1;
  authService.getUsuario.mockReturnValue({ id: '1' });
  cultivoService.registrarFinca.mockReturnValue(of({ id: '99' }));
  cultivoService.actualizarCentroideFinca.mockReturnValue(of({}));
  component.registrar();
  expect(component.exito).toBe(true);
  await new Promise(resolve => setTimeout(resolve, 1300));
  expect(router.navigate).toHaveBeenCalledWith(['/cultivo']);
});

it('registrar() should navigate even if actualizarCentroide fails', async () => {
  component.form = { nombre: 'Finca', ubicacion: 'Bogotá', hectareas: 10 };
  component.centroideLat = 4.5;
  component.centroideLng = -74.1;
  authService.getUsuario.mockReturnValue({ id: '1' });
  cultivoService.registrarFinca.mockReturnValue(of({ id: '99' }));
  cultivoService.actualizarCentroideFinca.mockReturnValue(throwError(() => new Error()));
  component.registrar();
  expect(component.exito).toBe(true);
  await new Promise(resolve => setTimeout(resolve, 1300));
  expect(router.navigate).toHaveBeenCalledWith(['/cultivo']);
});

  it('registrar() should set error and guardando=false on failure', () => {
    component.form = { nombre: 'Finca', ubicacion: 'Bogotá', hectareas: 10 };
    component.centroideLat = 4.5;
    component.centroideLng = -74.1;
    authService.getUsuario.mockReturnValue({ id: '1' });
    cultivoService.registrarFinca.mockReturnValue(throwError(() => new Error()));
    component.registrar();
    expect(component.error).toContain('Error al registrar');
    expect(component.guardando).toBe(false);
  });

  it('cancelar() should navigate to /cultivo', () => {
    component.cancelar();
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo']);
  });

  it('buscarUbicacion() should do nothing when busquedaMapa is empty', () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({} as any);
    component.buscarUbicacion();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('ngOnDestroy() should call map.remove if map exists', () => {
    const removeSpy = vi.fn();
    (component as any).map = { remove: removeSpy };
    component.ngOnDestroy();
    expect(removeSpy).toHaveBeenCalled();
  });
});