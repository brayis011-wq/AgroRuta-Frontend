import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  ViewChild,
  computed,
  signal,
} from '@angular/core';

import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService, Lang } from '../../../../core/services/language.service';
import { FincaActivaService } from '../../../../core/services/active-farm.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TemaService } from '../../../../core/services/theme.service';
import { ProfileFormComponent } from '../../profile-form/profile-form';
import { ChangePasswordFormComponent } from '../../change-password-form/change-password-form';
import { TwoFactorComponent } from '../../two-factor/two-factor';
import { OpenSessionsComponent } from '../../open-sessions/open-sessions';
import { PushToggleComponent } from '../../push-toggle/push-toggle';
import { ProfileService } from '../../../../core/services/profile.service';
import {
  Perfil,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../../../../core/models/profile.model';
import {
  NotificacionesService,
  PreferenciasCorreo,
} from '../../../../core/services/notifications.service';
import { iniciales as inicialesDe } from '../../../../shared/iniciales';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export type GrupoConfig = 'perfil' | 'seguridad' | 'avisos' | 'preferencias';

/** Pestañas de Configuración y las secciones (ids) que van en cada una */
export const GRUPOS_CONFIG: {
  id: GrupoConfig;
  icono: string;
  clave: string;
  secciones: string[];
}[] = [
  { id: 'perfil', icono: 'ti-user', clave: 'config.tabs.profile', secciones: ['perfil'] },
  {
    id: 'seguridad',
    icono: 'ti-lock',
    clave: 'config.tabs.security',
    secciones: ['seguridad', 'dos-pasos', 'sesiones'],
  },
  { id: 'avisos', icono: 'ti-bell', clave: 'config.tabs.notices', secciones: ['correos'] },
  {
    id: 'preferencias',
    icono: 'ti-adjustments',
    clave: 'config.tabs.prefs',
    secciones: ['preferencias'],
  },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-configuration-page',
  standalone: true,
  imports: [
    ProfileFormComponent,
    ChangePasswordFormComponent,
    TwoFactorComponent,
    OpenSessionsComponent,
    PushToggleComponent,
    TranslatePipe,
  ],
  templateUrl: './configuration-page.html',
  styleUrls: [
    '../../../crop/crop-ui.css',
    '../../../crop/crop-blocks.css',
    './configuration-page.scss',
  ],
})
export class ConfigurationPageComponent implements OnInit {
  private profileService = inject(ProfileService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private auth = inject(AuthService);
  readonly idioma = inject(LanguageService);
  readonly fincaActiva = inject(FincaActivaService);
  readonly temaSvc = inject(TemaService);
  private notificaciones = inject(NotificacionesService);

  /** Correos opcionales (null mientras cargan) */
  readonly correos = signal<PreferenciasCorreo | null>(null);
  readonly guardandoCorreos = signal(false);

  @ViewChild(ChangePasswordFormComponent) private formClave?: ChangePasswordFormComponent;

  /**
   * Qué avisos y preferencias tienen sentido según el rol (lo mismo que envía el servidor):
   * - Agricultor: resumen del cultivo, solicitudes de trabajadores, avisos push y finca al entrar.
   * - Trabajador: solo le llegan sus pagos y la respuesta a su solicitud (sin interruptores de correo).
   * - Administrador: solo los avisos de seguridad de su cuenta.
   */
  readonly rol = this.auth.getUsuario()?.rol ?? null;
  readonly esAgricultor = this.rol === 'Agricultor';
  readonly esTrabajador = this.rol === 'Trabajador';

  /** La finca al entrar solo es del agricultor; la lista podría traer fincas de otra sesión en esta pestaña */
  readonly tieneFincas = computed(() => this.esAgricultor && this.fincaActiva.fincas().length > 0);

  perfil: Perfil | null = null;
  loadingPage = true;
  loadingProfile = false;
  loadingPassword = false;
  toast: Toast | null = null;

  ngOnInit(): void {
    const seccion = this.router.parseUrl(this.router.url).fragment;
    if (seccion) this.ir(seccion);
    this.loadPerfil();
    if (!this.esAgricultor) return; // los demás roles no tienen correos opcionales
    this.notificaciones.obtener().subscribe({
      next: (p) => this.correos.set(p),
      error: () => this.correos.set(null),
    });
  }

  /** Guarda al momento; si falla, el interruptor vuelve a como estaba */
  cambiarCorreo(campo: keyof PreferenciasCorreo, valor: boolean): void {
    const antes = this.correos();
    if (!antes) return;
    const nuevas = { ...antes, [campo]: valor };
    this.correos.set(nuevas);
    this.guardandoCorreos.set(true);
    this.notificaciones.guardar(nuevas).subscribe({
      next: (p) => {
        this.correos.set(p);
        this.guardandoCorreos.set(false);
        this.showToast('config.mail.saved', 'success');
      },
      error: () => {
        this.correos.set(antes);
        this.guardandoCorreos.set(false);
        this.showToast('config.mail.error', 'error');
      },
    });
  }

  loadPerfil(): void {
    this.loadingPage = true;
    this.profileService.getPerfil().subscribe({
      next: (data: Perfil) => {
        this.perfil = data;
        this.loadingPage = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingPage = false;
        this.showToast('config.toast.loadError', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  onSaveProfile(data: UpdateProfileRequest): void {
    this.loadingProfile = true;
    this.profileService.updatePerfil(data).subscribe({
      next: (updated: Perfil) => {
        this.perfil = updated;
        this.loadingProfile = false;
        this.showToast('config.toast.profileSaved', 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProfile = false;
        this.showToast('config.toast.profileError', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  onChangePassword(data: ChangePasswordRequest): void {
    this.loadingPassword = true;
    this.profileService.changePassword(data).subscribe({
      next: () => {
        this.loadingPassword = false;
        this.formClave?.limpiar();
        this.showToast('config.toast.passwordSaved', 'success');
        this.cdr.detectChanges();
      },
      error: (err: { status: number }) => {
        this.loadingPassword = false;
        const msg =
          err?.status === 400 ? 'config.toast.passwordWrong' : 'config.toast.passwordError';
        this.showToast(msg, 'error');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Pestañas ──────────────────────────────────────────────────
  readonly grupos = GRUPOS_CONFIG;
  readonly grupo = signal<GrupoConfig>('perfil');

  elegirGrupo(g: GrupoConfig): void {
    this.grupo.set(g);
  }

  /** Abre la pestaña de una sección (la campana enlaza a #correos) y baja hasta ella */
  ir(id: string): void {
    const g = GRUPOS_CONFIG.find((x) => x.secciones.includes(id));
    if (g) this.grupo.set(g.id);
    setTimeout(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  cambiarIdioma(lang: Lang): void {
    this.idioma.set(lang);
  }

  elegirFinca(valor: string): void {
    this.fincaActiva.elegir(valor === '' ? null : Number(valor));
    this.showToast('config.prefs.farmSaved', 'success');
  }

  cerrarSesion(): void {
    this.profileService.olvidarFoto();
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Iniciales para el resumen de la cuenta */
  get iniciales(): string {
    return inicialesDe(this.perfil?.nombre);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 4000);
  }
}
