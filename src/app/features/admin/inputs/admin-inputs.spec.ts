import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminInsumosComponent } from './admin-inputs';
import { AgriculturalInputService } from '../../../core/services/agricultural-input.service';

describe('AdminInsumosComponent', () => {
  let fixture: ComponentFixture<AdminInsumosComponent>;
  let component: AdminInsumosComponent;
  let svc: any;

  const mancozeb: any = {
    id: 1, nombre: 'Mancozeb', tipo: 'FUNGICIDA', tipoDisplay: 'Fungicida', unidadSugerida: 'GRAMOS',
    dosisSugerida: 2.5, reentradaHoras: 24, activo: true, creadoEn: '2026-01-01T00:00:00',
  };

  beforeEach(async () => {
    svc = {
      getAllAdmin: vi.fn().mockReturnValue(of([mancozeb])),
      changeStatus: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [AdminInsumosComponent],
      providers: [{ provide: AgriculturalInputService, useValue: svc }],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminInsumosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not save an invalid form', () => {
    component.nuevo();
    component.form.patchValue({ nombre: '', dosisSugerida: 0 });
    component.guardar();
    expect(svc.create).not.toHaveBeenCalled();
    expect(component.invalido('nombre')).toBe(true);
  });

  it('creates a new input and adds it to the list', () => {
    svc.create.mockReturnValue(of({ ...mancozeb, id: 2, nombre: 'Glifosato', tipo: 'HERBICIDA' }));
    component.nuevo();
    component.form.patchValue({ nombre: '  Glifosato ', tipo: 'HERBICIDA', dosisSugerida: 3, reentradaHoras: 12 });
    component.guardar();
    expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Glifosato', tipo: 'HERBICIDA' }));
    expect(component.insumos.length).toBe(2);
    expect(component.formularioAbierto).toBe(false);
  });

  it('updates an existing input', () => {
    svc.update.mockReturnValue(of({ ...mancozeb, dosisSugerida: 3 }));
    component.editar(mancozeb);
    component.form.patchValue({ dosisSugerida: 3 });
    component.guardar();
    expect(svc.update).toHaveBeenCalledWith(1, expect.objectContaining({ dosisSugerida: 3 }));
    expect(component.insumos[0].dosisSugerida).toBe(3);
  });

  it('deactivates after confirming and keeps it in the list', () => {
    svc.changeStatus.mockReturnValue(of({ ...mancozeb, activo: false }));
    component.alternarEstado(mancozeb);
    expect(component.porDesactivar).toBe(mancozeb);
    component.confirmarDesactivar();
    expect(svc.changeStatus).toHaveBeenCalledWith(1, false);
    expect(component.insumos[0].activo).toBe(false);
    expect(component.porDesactivar).toBeNull();
  });

  it('activates an inactive input without asking', () => {
    const inactivo = { ...mancozeb, activo: false };
    component.insumos = [inactivo];
    svc.changeStatus.mockReturnValue(of({ ...mancozeb, activo: true }));
    component.alternarEstado(inactivo);
    expect(component.porDesactivar).toBeNull();
    expect(svc.changeStatus).toHaveBeenCalledWith(1, true);
    expect(component.insumos[0].activo).toBe(true);
  });

  it('filters by state', () => {
    component.insumos = [mancozeb, { ...mancozeb, id: 2, nombre: 'Viejo', activo: false }];
    component.filtroEstado = 'inactivos';
    expect(component.visibles.map((i) => i.nombre)).toEqual(['Viejo']);
    component.filtroEstado = 'activos';
    expect(component.visibles.map((i) => i.nombre)).toEqual(['Mancozeb']);
  });
});
