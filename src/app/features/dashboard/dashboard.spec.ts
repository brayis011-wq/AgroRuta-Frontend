// src/app/features/dashboard/dashboard.spec.ts
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard';
import { AuthService } from '../../core/services/auth';
import { CultivoService } from '../../core/services/cultivo.service';
import { WeatherWidgetComponent } from '../weather/weather-widget/weather-widget.component';

@Component({ selector: 'app-weather-widget', standalone: true, template: '' })
class WeatherWidgetStub {}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authServiceMock: any;
  let cultivoServiceMock: any;
  let router: Router;

  const mockUsuario: any = { id: 1, nombre: 'Juan', email: 'juan@test.com' };

  const mockFincas: any[] = [
    { id: 1, nombre: 'Finca A', hectareas: 10 },
    { id: 2, nombre: 'Finca B', hectareas: 5  },
  ];

  const mockLotes: any[] = [
    { id: 1, fincaId: 1 },
    { id: 2, fincaId: 1 },
  ];

  beforeEach(async () => {
    authServiceMock = {
      getUsuario: vi.fn().mockReturnValue(mockUsuario),
      logout:     vi.fn(),
    };

    cultivoServiceMock = {
      listarFincasPorAgricultor: vi.fn().mockReturnValue(of(mockFincas)),
      listarLotesPorFinca:       vi.fn().mockReturnValue(of(mockLotes)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService,    useValue: authServiceMock    },
        { provide: CultivoService, useValue: cultivoServiceMock },
      ],
    })
      .overrideComponent(DashboardComponent, {
        remove: { imports: [WeatherWidgetComponent] },
        add:    { imports: [WeatherWidgetStub]      },
      })
      .compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load usuario and call cargarStats()', () => {
    vi.spyOn(component, 'cargarStats');
    fixture.detectChanges();
    expect(authServiceMock.getUsuario).toHaveBeenCalled();
    expect(component.usuario).toEqual(mockUsuario);
    expect(component.cargarStats).toHaveBeenCalled();
  });

  it('cargarStats() should set totalFincas and totalHectareas correctly', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalFincas).toBe(2);
    expect(component.totalHectareas).toBe(15);
  });

  it('cargarStats() should set totalLotes summing all fincas', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalLotes).toBe(4);
    expect(component.cargandoStats).toBe(false);
  });

  it('cargarStats() should set cargandoStats=false when no usuarioId', () => {
    authServiceMock.getUsuario.mockReturnValue(null);
    component.usuario = null;
    component.cargarStats();
    expect(component.cargandoStats).toBe(false);
  });

  it('cargarStats() should handle empty fincas list', async () => {
    cultivoServiceMock.listarFincasPorAgricultor.mockReturnValue(of([]));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalFincas).toBe(0);
    expect(component.totalHectareas).toBe(0);
    expect(component.totalLotes).toBe(0);
    expect(component.cargandoStats).toBe(false);
  });

  it('cargarStats() should handle finca with undefined hectareas', async () => {
    cultivoServiceMock.listarFincasPorAgricultor.mockReturnValue(
      of([{ id: 1, nombre: 'Sin hectareas' }] as any)
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalHectareas).toBe(0);
  });

  it('cargarStats() should handle error from listarFincasPorAgricultor', async () => {
    cultivoServiceMock.listarFincasPorAgricultor.mockReturnValue(
      throwError(() => new Error('API error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.cargandoStats).toBe(false);
  });

  it('cargarStats() should handle error from listarLotesPorFinca gracefully', async () => {
    cultivoServiceMock.listarLotesPorFinca.mockReturnValue(
      throwError(() => new Error('lotes error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalLotes).toBe(0);
    expect(component.cargandoStats).toBe(false);
  });

  it('irA() should navigate to given route', () => {
    vi.spyOn(router, 'navigate');
    component.irA('/cultivo');
    expect(router.navigate).toHaveBeenCalledWith(['/cultivo']);
  });

  it('logout() should call authService.logout and navigate to /login', () => {
    vi.spyOn(router, 'navigate');
    component.logout();
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
