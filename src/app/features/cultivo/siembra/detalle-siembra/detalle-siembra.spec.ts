import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { DetalleSiembraComponent } from './detalle-siembra';
import { CultivoService } from '../../../../core/services/cultivo.service';

const mockSiembra = { id: 1, loteId: 10, cultivo: 'Maiz', fechaSiembra: '2024-01-01', estado: 'ACTIVA' };
const mockLote = { id: 10, nombre: 'Lote A', centroideLat: 4.5, centroideLng: -74.1 };
const mockActividades = [
  { id: 1, tipo: 'RIEGO', descripcion: 'Riego diario', fecha: '2024-03-01', siembraId: 1 },
  { id: 2, tipo: 'PODA', descripcion: 'Poda general', fecha: '2024-03-10', siembraId: 1 },
];
const mockFumigaciones = [
  { id: 1, producto: 'Fungicida X', dosis: 2, unidadMedida: 'L', areaAplicada: 1, fecha: '2024-02-20', observaciones: 'Ninguna', siembraId: 1 },
];
const mockCosechas = [
  { id: 1, cantidadKg: 500, calidad: 'PRIMERA', fecha: '2024-04-01', observaciones: 'Buena', siembraId: 1 },
];

describe('DetalleSiembraComponent', () => {
  let component: DetalleSiembraComponent;
  let fixture: ComponentFixture<DetalleSiembraComponent>;
  let cultivoServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      buscarSiembra: vi.fn().mockReturnValue(of(mockSiembra)),
      buscarLote: vi.fn().mockReturnValue(of(mockLote)),
      listarActividades: vi.fn().mockReturnValue(of(mockActividades)),
      listarFumigaciones: vi.fn().mockReturnValue(of(mockFumigaciones)),
      listarCosechas: vi.fn().mockReturnValue(of(mockCosechas)),
      totalKgCosechado: vi.fn().mockReturnValue(of(500)),
      eliminarSiembra: vi.fn().mockReturnValue(of({})),
    };
    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DetalleSiembraComponent],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleSiembraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('ngOnInit() should load siembra', () => { expect(component.siembra).toEqual(mockSiembra); });
  it('ngOnInit() should set fincaLat and fincaLng', () => {
    expect(component.fincaLat).toBe(4.5);
    expect(component.fincaLng).toBe(-74.1);
  });
  it('ngOnInit() should set error on buscarSiembra failure', () => {
    cultivoServiceMock.buscarSiembra.mockReturnValue(throwError(() => new Error()));
    component.ngOnInit();
    expect(component.error).toBe('Error al cargar la siembra.');
  });
  it('ngOnInit() should not set coords if lote has no centroide', () => {
    cultivoServiceMock.buscarLote.mockReturnValue(of({ id: 10, centroideLat: null, centroideLng: null }));
    component.fincaLat = null;
    component.ngOnInit();
    expect(component.fincaLat).toBeNull();
  });
  it('cargarDatos() should populate actividades and cosechas', () => {
    expect(component.actividades).toEqual(mockActividades);
    expect(component.cosechas).toEqual(mockCosechas);
    expect(component.totalKg).toBe(500);
  });
  it('cargarDatos() should set totalKg to 0 when null', () => {
    cultivoServiceMock.totalKgCosechado.mockReturnValue(of(null));
    component.cargarDatos(1);
    expect(component.totalKg).toBe(0);
  });
  it('cargarDatos() should handle errors', () => {
    cultivoServiceMock.listarActividades.mockReturnValue(throwError(() => new Error()));
    cultivoServiceMock.listarFumigaciones.mockReturnValue(throwError(() => new Error()));
    cultivoServiceMock.listarCosechas.mockReturnValue(throwError(() => new Error()));
    component.cargarDatos(1);
    expect(component.cargando).toBe(false);
  });
  it('timelineFiltrado should return all when filtro is todo', () => {
    component.filtroActivo = 'todo';
    expect(component.timelineFiltrado.length).toBe(component.timelineCompleto.length);
  });
  it('timelineFiltrado should filter by actividad', () => {
    component.filtroActivo = 'actividad';
    component.timelineFiltrado.forEach(i => expect(i.tipo).toBe('actividad'));
  });
  it('timelineFiltrado should filter by fumigacion', () => {
    component.filtroActivo = 'fumigacion';
    component.timelineFiltrado.forEach(i => expect(i.tipo).toBe('fumigacion'));
  });
  it('timelineFiltrado should filter by cosecha', () => {
    component.filtroActivo = 'cosecha';
    component.timelineFiltrado.forEach(i => expect(i.tipo).toBe('cosecha'));
  });
  it('setFiltro() should change filtroActivo', () => {
    component.setFiltro('cosecha');
    expect(component.filtroActivo).toBe('cosecha');
  });
  it('getIcono() should return correct icons', () => {
    expect(component.getIcono('actividad')).toBe('📋');
    expect(component.getIcono('fumigacion')).toBe('💨');
    expect(component.getIcono('cosecha')).toBe('⚖️');
    expect(component.getIcono('otro')).toBe('•');
  });
  it('iniciarEliminacion() should show confirmation', () => {
    component.iniciarEliminacion();
    expect(component.mostrarConfirmacion).toBe(true);
  });
  it('cancelarEliminacion() should hide confirmation', () => {
    component.mostrarConfirmacion = true;
    component.cancelarEliminacion();
    expect(component.mostrarConfirmacion).toBe(false);
  });
  it('confirmarEliminacion() should do nothing when text wrong', () => {
    component.siembra = mockSiembra as any;
    component.textoConfirmacion = 'wrong';
    component.confirmarEliminacion();
    expect(cultivoServiceMock.eliminarSiembra).not.toHaveBeenCalled();
  });
  it('confirmarEliminacion() should navigate on success', () => {
    component.siembra = mockSiembra as any;
    component.textoConfirmacion = 'confirmar';
    component.confirmarEliminacion();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/lote', 10]);
  });
  it('confirmarEliminacion() should set error on failure', () => {
    cultivoServiceMock.eliminarSiembra.mockReturnValue(throwError(() => new Error()));
    component.siembra = mockSiembra as any;
    component.textoConfirmacion = 'confirmar';
    component.confirmarEliminacion();
    expect(component.error).toBe('Error al eliminar la siembra.');
  });
  it('getDiasTranscurridos() should return 0 if no siembra', () => {
    component.siembra = null;
    expect(component.getDiasTranscurridos()).toBe(0);
  });
  it('getDiasTranscurridos() should return positive for past date', () => {
    component.siembra = { ...mockSiembra, fechaSiembra: '2020-01-01' } as any;
    expect(component.getDiasTranscurridos()).toBeGreaterThan(0);
  });
  it('getUltimaActividad() should return Sin actividades when empty', () => {
    component.actividades = [];
    expect(component.getUltimaActividad()).toBe('Sin actividades');
  });
  it('getUltimaActividad() should return last activity', () => {
    component.actividades = mockActividades as any;
    expect(component.getUltimaActividad()).toContain('PODA');
  });
  it('getUltimaFumigacion() should return Sin fumigaciones when empty', () => {
    component.fumigaciones = [];
    expect(component.getUltimaFumigacion()).toBe('Sin fumigaciones');
  });
  it('getUltimaFumigacion() should return last fumigacion', () => {
    component.fumigaciones = mockFumigaciones as any;
    expect(component.getUltimaFumigacion()).toContain('Fungicida X');
  });
  it('getAlerta() should return red when no fumigaciones', () => {
    component.fumigaciones = [];
    expect(component.getAlerta()).toContain('Sin fumigaciones');
  });
  it('getAlerta() should return red when >7 days ago', () => {
    component.fumigaciones = [{ ...mockFumigaciones[0], fecha: '2020-01-01' }] as any;
    expect(component.getAlerta()).toContain('🔴');
  });
  it('getAlerta() should return yellow when 6 days ago', () => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    component.fumigaciones = [{ ...mockFumigaciones[0], fecha: d.toISOString().split('T')[0] }] as any;
    expect(component.getAlerta()).toContain('🟡');
  });
  it('getAlerta() should return green when recent', () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    component.fumigaciones = [{ ...mockFumigaciones[0], fecha: d.toISOString().split('T')[0] }] as any;
    expect(component.getAlerta()).toContain('🟢');
  });
  it('registrarActividad() should navigate', () => {
    component.siembra = mockSiembra as any;
    component.registrarActividad();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 1, 'actividad']);
  });
  it('registrarFumigacion() should navigate', () => {
    component.siembra = mockSiembra as any;
    component.registrarFumigacion();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 1, 'fumigacion']);
  });
  it('registrarCosecha() should navigate', () => {
    component.siembra = mockSiembra as any;
    component.registrarCosecha();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/siembra', 1, 'cosecha']);
  });
  it('volver() should navigate to lote', () => {
    component.siembra = mockSiembra as any;
    component.volver();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/lote', 10]);
  });
});
