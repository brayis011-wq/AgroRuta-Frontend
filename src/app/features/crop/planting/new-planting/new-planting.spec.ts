import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NuevaSiembraComponent } from './new-planting';
import { CultivoService } from '../../../../core/services/crop.service';
import { CatalogoCultivoService } from '../../../../core/services/crop-catalog.service';

const v = (id: number, nombre: string, tipoCultivoId: number, tipo: string) =>
  ({ id, nombre, activo: true, tipoCultivoId, tipoCultivoNombre: tipo });
const catalogo = [
  { id: 1, nombre: 'Uchuva', activo: true, variedades: [v(1, 'Colombia', 1, 'Uchuva'), v(2, 'Kenya', 1, 'Uchuva')] },
  { id: 2, nombre: 'Aguacate', activo: true, variedades: [v(5, 'Hass', 2, 'Aguacate')] },
  { id: 3, nombre: 'Vacío', activo: true, variedades: [] },
];

describe('NuevaSiembraComponent', () => {
  let component: NuevaSiembraComponent;
  let fixture: ComponentFixture<NuevaSiembraComponent>;
  let cultivoServiceMock: any;
  let catalogoMock: any;
  let routerMock: any;

  async function crear() {
    await TestBed.configureTestingModule({
      imports: [NuevaSiembraComponent],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: CatalogoCultivoService, useValue: catalogoMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => key === 'fincaId' ? '3' : '7' } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NuevaSiembraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    cultivoServiceMock = { registrarSiembra: vi.fn().mockReturnValue(of({})) };
    catalogoMock = { activos: vi.fn().mockReturnValue(of(catalogo)) };
    routerMock = { navigate: vi.fn() };
    await crear();
  });

  const llenar = () => {
    component.form.fechaSiembra = '2024-01-01';
    component.form.cantidadPlantas = 100;
    component.elegirCultivo(1);
    component.form.variedadId = 2;
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should set fincaId and loteId from route', () => {
    expect(component.fincaId).toBe(3);
    expect(component.loteId).toBe(7);
  });

  it('loads only crops that have varieties', () => {
    expect(component.cultivos.map((c) => c.nombre)).toEqual(['Uchuva', 'Aguacate']);
  });

  it('choosing a crop shows its varieties and resets the variety', () => {
    component.elegirCultivo(1);
    expect(component.variedades.map((x) => x.nombre)).toEqual(['Colombia', 'Kenya']);
    expect(component.form.variedadId).toBeNull();
  });

  it('auto-selects the variety when the crop has only one', () => {
    component.elegirCultivo(2);
    expect(component.form.variedadId).toBe(5);
  });

  it('registrar() should set error when fields are empty', () => {
    component.registrar();
    expect(component.error).toBe('siembra.new.errors.required');
    expect(cultivoServiceMock.registrarSiembra).not.toHaveBeenCalled();
  });

  it('registrar() sends the variety id from the catalog', () => {
    llenar();
    component.registrar();
    expect(cultivoServiceMock.registrarSiembra).toHaveBeenCalledWith({
      fechaSiembra: '2024-01-01', cantidadPlantas: 100, variedadId: 2, loteId: 7,
    });
  });

  it('registrar() should set exito=true on success', () => {
    llenar();
    component.registrar();
    expect(component.exito).toBe(true);
    expect(component.guardando).toBe(false);
  });

  it('registrar() shows the backend reason on failure', () => {
    cultivoServiceMock.registrarSiembra.mockReturnValue(throwError(() => ({ error: { message: 'El lote ya tiene una siembra' } })));
    llenar();
    component.registrar();
    expect(component.error).toBe('El lote ya tiene una siembra');
  });

  it('registrar() falls back to a generic error', () => {
    cultivoServiceMock.registrarSiembra.mockReturnValue(throwError(() => new Error()));
    llenar();
    component.registrar();
    expect(component.error).toBe('siembra.new.errors.register');
  });

  it('shows an error when the catalog cannot be loaded', async () => {
    TestBed.resetTestingModule();
    catalogoMock.activos.mockReturnValue(throwError(() => new Error()));
    await crear();
    expect(component.error).toBe('siembra.new.errors.loadCatalog');
  });

  it('cancelar() vuelve al lote', () => {
    component.cancelar();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/crops/plot', 7]);
  });
});
