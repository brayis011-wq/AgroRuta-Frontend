import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
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
  styleUrls: ['./configuration-page.component.scss'],
})
export class ConfigurationPageComponent implements OnInit {

  private profileService = inject(ProfileService);
  private cdr = inject(ChangeDetectorRef);

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

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 4000);
  }
}
