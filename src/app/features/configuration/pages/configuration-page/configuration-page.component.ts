import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService, Lang } from '../../../../core/services/language.service';
import { FincaActivaService } from '../../../../core/services/finca-activa.service';
import { AuthService } from '../../../../core/services/auth';
import { ProfileFormComponent } from '../../profile-form/profile-form.component';
import { ChangePasswordFormComponent } from '../../change-password-form/change-password-form.component';
import { ProfileService } from '../../../../core/services/profile.service';
import { Perfil, UpdateProfileRequest, ChangePasswordRequest } from '../../../../core/models/profile.model';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-configuration-page',
  standalone: true,
  imports: [CommonModule, ProfileFormComponent, ChangePasswordFormComponent, TranslatePipe],
  templateUrl: './configuration-page.component.html',
  styleUrls: ['../../../cultivo/cultivo-ui.css', '../../../cultivo/cultivo-bloques.css', './configuration-page.component.scss'],
})
export class ConfigurationPageComponent implements OnInit {

  private profileService = inject(ProfileService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private auth = inject(AuthService);
  readonly idioma = inject(LanguageService);
  readonly fincaActiva = inject(FincaActivaService);

  @ViewChild(ChangePasswordFormComponent) private formClave?: ChangePasswordFormComponent;

  /** Las preferencias de finca solo aplican al agricultor (el administrador no tiene fincas) */
  readonly tieneFincas = computed(() => this.fincaActiva.fincas().length > 0);

  perfil: Perfil | null = null;
  loadingPage = true;
  loadingProfile = false;
  loadingPassword = false;
  toast: Toast | null = null;

  ngOnInit(): void {
    this.loadPerfil();
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
        const msg = err?.status === 400
          ? 'config.toast.passwordWrong'
          : 'config.toast.passwordError';
        this.showToast(msg, 'error');
        this.cdr.detectChanges();
      },
    });
  }

  /** Baja hasta una sección sin cambiar la URL */
  ir(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cambiarIdioma(lang: Lang): void {
    this.idioma.set(lang);
  }

  elegirFinca(valor: string): void {
    this.fincaActiva.elegir(valor === '' ? null : Number(valor));
    this.showToast('config.prefs.farmSaved', 'success');
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Iniciales para el resumen de la cuenta */
  get iniciales(): string {
    const n = this.perfil?.nombre ?? '';
    return n.split(' ').filter(Boolean).map((w) => w[0]).join('').substring(0, 2).toUpperCase() || '?';
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
