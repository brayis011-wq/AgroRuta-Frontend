import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { ListaActividadesComponent } from './list-activities';
import { ActividadService } from '../../../core/services/worker.service';

const mockActividades = [
  { id: 1, nombre: 'Poda', descripcion: 'Poda de ramas', activo: true },
  { id: 2, nombre: 'Riego', descripcion: 'Riego manual', activo: true },
];

describe('ListaActividadesComponent', () => {
  let component: ListaActividadesComponent;
  let fixture: ComponentFixture<ListaActividadesComponent>;
  let actividadServiceMock: any;

  beforeEach(async () => {
    actividadServiceMock = {
      listar: vi.fn().mockReturnValue(of(mockActividades)),
      crear: vi.fn().mockReturnValue(of({})),
      actualizar: vi.fn().mockReturnValue(of({})),
      desactivar: vi.fn().mockReturnValue(of({})),
    };
    await TestBed.configureTestingModule({
      imports: [ListaActividadesComponent, ReactiveFormsModule, CommonModule],
      providers: [
        { provide: ActividadService, useValue: actividadServiceMock },
        ChangeDetectorRef,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListaActividadesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('ngOnInit() should load actividades', () => { expect(component.actividades).toEqual(mockActividades); });
  it('cargar() should set error on failure', () => {
    actividadServiceMock.listar.mockReturnValue(throwError(() => new Error()));
    component.cargar();
    expect(component.error).toBe('Error al cargar actividades');
  });
  it('iniciarForm() should create empty form', () => {
    component.iniciarForm();
    expect(component.form.get('nombre')?.value).toBe('');
  });
  it('iniciarForm() should patch form with actividad', () => {
    component.iniciarForm(mockActividades[0] as any);
    expect(component.form.get('nombre')?.value).toBe('Poda');
  });
  it('abrirNuevo() should set mostrarForm=true', () => {
    component.abrirNuevo();
    expect(component.mostrarForm).toBe(true);
    expect(component.modoEdicion).toBeNull();
  });
  it('abrirEditar() should set modoEdicion', () => {
    component.abrirEditar(mockActividades[0] as any);
    expect(component.modoEdicion).toEqual(mockActividades[0]);
    expect(component.mostrarForm).toBe(true);
  });
  it('invalido() should return false when not touched', () => { expect(component.invalido('nombre')).toBe(false); });
  it('guardar() should call crear when modoEdicion is null', () => {
    component.modoEdicion = null;
    component.form.get('nombre')?.setValue('Nueva');
    component.form.get('descripcion')?.setValue('Desc');
    component.guardar();
    expect(actividadServiceMock.crear).toHaveBeenCalled();
  });
  it('guardar() should call actualizar when modoEdicion has id', () => {
    component.modoEdicion = mockActividades[0] as any;
    component.form.get('nombre')?.setValue('Edit');
    component.form.get('descripcion')?.setValue('Desc');
    component.guardar();
    expect(actividadServiceMock.actualizar).toHaveBeenCalledWith(1, expect.any(Object));
  });
  it('guardar() should set error on failure', () => {
    actividadServiceMock.crear.mockReturnValue(throwError(() => new Error()));
    component.modoEdicion = null;
    component.form.get('nombre')?.setValue('Nueva');
    component.form.get('descripcion')?.setValue('Desc');
    component.guardar();
    expect(component.error).toBe('Error al guardar');
  });
  it('desactivar() should do nothing when id is null', () => {
    component.desactivar({ nombre: 'Test', descripcion: 'Test' } as any);
    expect(actividadServiceMock.desactivar).not.toHaveBeenCalled();
  });
  it('desactivar() should call service when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.desactivar(mockActividades[0] as any);
    expect(actividadServiceMock.desactivar).toHaveBeenCalledWith(1);
  });
  it('desactivar() should not call service when not confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.desactivar(mockActividades[0] as any);
    expect(actividadServiceMock.desactivar).not.toHaveBeenCalled();
  });
});
