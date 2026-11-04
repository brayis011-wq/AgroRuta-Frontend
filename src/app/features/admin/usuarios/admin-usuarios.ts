import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth';
import { LanguageService } from '../../../core/services/language.service';
import { ROLES, RolUsuario, UsuarioAdmin } from '../../../core/models/admin.model';
import { formatoFecha } from '../../../shared/formato';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

/** Acción que espera confirmación en el diálogo. */
interface AccionPendiente {
  usuario: UsuarioAdmin;
  tipo: 'rol' | 'estado';
  rol?: RolUsuario;
  activo?: boolean;
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-usuarios.html',
  styleUrls: ['../../../shared/styles/panel-page.css', './admin-usuarios.css'],
})
export class AdminUsuariosComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly lang = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly roles = ROLES;
  readonly miId = this.authService.getUsuario()?.id ?? null;

  usuarios: UsuarioAdmin[] = [];
  cargando = true;
  errorCarga = false;

  busqueda = '';
  filtroRol: RolUsuario | '' = '';
  filtroEstado: FiltroEstado = 'todos';

  pendiente: AccionPendiente | null = null;
  guardando = false;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.adminService.usuarios().subscribe({
      next: (lista) => {
        this.usuarios = lista;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorCarga = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filtrados(): UsuarioAdmin[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.usuarios.filter((u) => {
      if (this.filtroRol && u.rol !== this.filtroRol) return false;
      if (this.filtroEstado === 'activos' && !u.activo) return false;
      if (this.filtroEstado === 'inactivos' && u.activo) return false;
      return !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }

  esYo(u: UsuarioAdmin): boolean {
    return u.id === this.miId;
  }

  fecha(valor: string | null): string {
    return formatoFecha(valor, this.lang.current());
  }

  /** El select cambió: se pide confirmación antes de guardar. */
  pedirCambioRol(u: UsuarioAdmin, rol: RolUsuario, select: HTMLSelectElement): void {
    select.value = u.rol; // el select no cambia hasta confirmar
    if (rol === u.rol) return;
    this.pendiente = { usuario: u, tipo: 'rol', rol };
  }

  pedirCambioEstado(u: UsuarioAdmin): void {
    this.pendiente = { usuario: u, tipo: 'estado', activo: !u.activo };
  }

  cancelar(): void {
    if (!this.guardando) this.pendiente = null;
  }

  confirmar(): void {
    const p = this.pendiente;
    if (!p) return;
    this.guardando = true;
    this.mensaje = null;

    const peticion = p.tipo === 'rol'
      ? this.adminService.cambiarRol(p.usuario.id, p.rol!)
      : this.adminService.cambiarEstado(p.usuario.id, p.activo!);

    peticion.subscribe({
      next: (actualizado) => {
        this.usuarios = this.usuarios.map((u) => (u.id === actualizado.id ? actualizado : u));
        this.guardando = false;
        this.pendiente = null;
        this.mensaje = {
          tipo: 'ok',
          texto: this.translate.instant(
            p.tipo === 'rol' ? 'admin.users.done.role' : actualizado.activo ? 'admin.users.done.activated' : 'admin.users.done.deactivated',
            { name: actualizado.nombre, role: this.translate.instant('enums.rol.' + actualizado.rol) },
          ),
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.pendiente = null;
        this.mensaje = {
          tipo: 'error',
          texto: err?.error?.message || this.translate.instant('admin.users.errors.save'),
        };
        this.cdr.detectChanges();
      },
    });
  }
}
