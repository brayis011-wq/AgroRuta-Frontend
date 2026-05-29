import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NuevaSiembraComponent } from './nueva-siembra';
import { CultivoService } from '../../../../core/services/cultivo.service';

describe('NuevaSiembraComponent', () => {
  let component: NuevaSiembraComponent;
  let fixture: ComponentFixture<NuevaSiembraComponent>;
  let cultivoServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    cultivoServiceMock = {
      registrarSiembra: vi.fn().mockReturnValue(of({})),
    };
    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NuevaSiembraComponent],
      providers: [
        { provide: CultivoService, useValue: cultivoServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'fincaId' ? '3' : '7',
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaSiembraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should set fincaId and loteId from route', () => {
    expect(component.fincaId).toBe(3);
    expect(component.loteId).toBe(7);
  });

  it('registrar() should set error when fields are empty', () => {
    component.form = { fechaSiembra: '', cantidadPlantas: null, variedad: '' };
    component.registrar();
    expect(component.error).toBe('Por favor completa todos los campos.');
  });

  it('registrar() should call registrarSiembra with correct data', () => {
    component.form = { fechaSiembra: '2024-01-01', cantidadPlantas: 100, variedad: 'COLOMBIA' };
    component.registrar();
    expect(cultivoServiceMock.registrarSiembra).toHaveBeenCalledWith({
      fechaSiembra: '2024-01-01',
      cantidadPlantas: 100,
      variedad: 'COLOMBIA',
      loteId: 7,
    });
  });

  it('registrar() should set exito=true on success', () => {
    component.form = { fechaSiembra: '2024-01-01', cantidadPlantas: 100, variedad: 'COLOMBIA' };
    component.registrar();
    expect(component.exito).toBe(true);
    expect(component.guardando).toBe(false);
  });

  it('registrar() should set error on failure', () => {
    cultivoServiceMock.registrarSiembra.mockReturnValue(throwError(() => new Error()));
    component.form = { fechaSiembra: '2024-01-01', cantidadPlantas: 100, variedad: 'COLOMBIA' };
    component.registrar();
    expect(component.error).toBe('Error al registrar la siembra. Intenta de nuevo.');
  });

  it('cancelar() should navigate to finca', () => {
    component.cancelar();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/cultivo/finca', 3]);
  });
});
