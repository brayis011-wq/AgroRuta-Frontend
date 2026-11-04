import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminUsuariosComponent } from './admin-usuarios';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth';
import { UsuarioAdmin } from '../../../core/models/admin.model';

const u = (id: number, nombre: string, rol: any, activo = true): UsuarioAdmin => ({
  id, nombre, email: `${nombre.toLowerCase()}@agroruta.com`, rol, activo, telefono: null, fechaCreacion: '2026-01-10T10:00:00',
});

describe('AdminUsuariosComponent', () => {
  let fixture: ComponentFixture<AdminUsuariosComponent>;
  let component: AdminUsuariosComponent;
  let adminSvc: any;

  const lista = [
    u(1, 'Admin', 'Administrador'),
    u(3, 'Ana', 'Agricultor'),
    u(4, 'Luis', 'Trabajador', false),
  ];

  beforeEach(async () => {
    adminSvc = {
      usuarios: vi.fn().mockReturnValue(of(lista)),
      cambiarEstado: vi.fn(),
      cambiarRol: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [AdminUsuariosComponent],
      providers: [
        { provide: AdminService, useValue: adminSvc },
        { provide: AuthService, useValue: { getUsuario: () => ({ id: 1, rol: 'Administrador' }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads all users', () => {
    expect(component.usuarios.length).toBe(3);
    expect(component.cargando).toBe(false);
  });

  it('filters by text, role and status', () => {
    component.busqueda = 'an';
    expect(component.filtrados.map((x) => x.id)).toEqual([3]);
    component.busqueda = '';
    component.filtroRol = 'Trabajador';
    expect(component.filtrados.map((x) => x.id)).toEqual([4]);
    component.filtroRol = '';
    component.filtroEstado = 'activos';
    expect(component.filtrados.map((x) => x.id)).toEqual([1, 3]);
  });

  it('recognizes the logged-in admin', () => {
    expect(component.esYo(lista[0])).toBe(true);
    expect(component.esYo(lista[1])).toBe(false);
  });

  it('asks for confirmation before changing a role and keeps the select unchanged', () => {
    const select = { value: 'Trabajador' } as HTMLSelectElement;
    component.pedirCambioRol(lista[1], 'Trabajador', select);
    expect(select.value).toBe('Agricultor');
    expect(component.pendiente).toEqual({ usuario: lista[1], tipo: 'rol', rol: 'Trabajador' });
    expect(adminSvc.cambiarRol).not.toHaveBeenCalled();
  });

  it('saves the role after confirming and updates the row', () => {
    adminSvc.cambiarRol.mockReturnValue(of({ ...lista[1], rol: 'Trabajador' }));
    component.pedirCambioRol(lista[1], 'Trabajador', { value: '' } as HTMLSelectElement);
    component.confirmar();
    expect(adminSvc.cambiarRol).toHaveBeenCalledWith(3, 'Trabajador');
    expect(component.usuarios.find((x) => x.id === 3)!.rol).toBe('Trabajador');
    expect(component.pendiente).toBeNull();
    expect(component.mensaje?.tipo).toBe('ok');
  });

  it('toggles the status after confirming', () => {
    adminSvc.cambiarEstado.mockReturnValue(of({ ...lista[2], activo: true }));
    component.pedirCambioEstado(lista[2]);
    component.confirmar();
    expect(adminSvc.cambiarEstado).toHaveBeenCalledWith(4, true);
    expect(component.usuarios.find((x) => x.id === 4)!.activo).toBe(true);
  });

  it('shows the backend message when the change is rejected', () => {
    adminSvc.cambiarEstado.mockReturnValue(
      throwError(() => ({ status: 422, error: { message: 'Debe quedar al menos un administrador activo.' } })),
    );
    component.pedirCambioEstado(lista[1]);
    component.confirmar();
    expect(component.mensaje).toEqual({ tipo: 'error', texto: 'Debe quedar al menos un administrador activo.' });
  });

  it('cancel closes the dialog without saving', () => {
    component.pedirCambioEstado(lista[1]);
    component.cancelar();
    expect(component.pendiente).toBeNull();
    expect(adminSvc.cambiarEstado).not.toHaveBeenCalled();
  });
});
