import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BackupService, Backup } from '../../../core/services/backup.service';
import { LanguageService } from '../../../core/services/language.service';

type ModalMode = 'restore' | 'delete';

@Component({
  selector: 'app-backup-home',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './backup-home.component.html',
  styleUrl: './backup-home.component.css',
})
export class BackupHomeComponent implements OnInit {
  private backupService = inject(BackupService);
  private cdr = inject(ChangeDetectorRef);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);

  // Palabra que el usuario debe escribir para confirmar una restauración
  readonly confirmWord = 'RESTAURAR';

  backups: Backup[] = [];
  loading = false;
  loadError = false;
  creating = false;
  busyName: string | null = null;

  message: { type: 'ok' | 'error'; text: string } | null = null;

  modal: { mode: ModalMode; backup: Backup } | null = null;
  confirmText = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.backupService.list().subscribe({
      next: (data) => {
        this.backups = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  crear(): void {
    this.creating = true;
    this.message = null;
    this.backupService.create().subscribe({
      next: () => {
        this.creating = false;
        this.showOk('backups.success.created');
        this.load();
      },
      error: (err) => {
        this.creating = false;
        this.showError(err, 'backups.errors.create');
      },
    });
  }

  descargar(b: Backup): void {
    this.busyName = b.name;
    this.message = null;
    this.backupService.download(b.name).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = b.name;
        a.click();
        window.URL.revokeObjectURL(url);
        this.busyName = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.busyName = null;
        this.showError(err, 'backups.errors.download');
      },
    });
  }

  abrirModal(mode: ModalMode, backup: Backup): void {
    this.modal = { mode, backup };
    this.confirmText = '';
  }

  cerrarModal(): void {
    this.modal = null;
    this.confirmText = '';
  }

  get canConfirm(): boolean {
    if (!this.modal) return false;
    return this.modal.mode === 'delete' || this.confirmText === this.confirmWord;
  }

  confirmarModal(): void {
    if (!this.modal || !this.canConfirm) return;
    const { mode, backup } = this.modal;
    this.cerrarModal();
    this.busyName = backup.name;
    this.message = null;

    if (mode === 'restore') {
      this.backupService.restore(backup.name).subscribe({
        next: () => {
          this.busyName = null;
          this.showOk('backups.success.restored');
          this.load(); // aparece la copia "previa a restauración"
        },
        error: (err) => {
          this.busyName = null;
          this.showError(err, 'backups.errors.restore');
        },
      });
    } else {
      this.backupService.remove(backup.name).subscribe({
        next: () => {
          this.busyName = null;
          this.showOk('backups.success.deleted');
          this.load();
        },
        error: (err) => {
          this.busyName = null;
          this.showError(err, 'backups.errors.delete');
        },
      });
    }
  }

  // ===== Formato =====

  fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  fmtDateTime(v: string): string {
    return new Intl.DateTimeFormat(this.lang.current(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(v));
  }

  // ===== Mensajes =====

  private showOk(key: string): void {
    this.message = { type: 'ok', text: this.translate.instant(key) };
    this.cdr.detectChanges();
  }

  private showError(err: any, fallbackKey: string): void {
    // 422 = regla de negocio (ej. "hay otra operación en curso"): el backend manda el motivo
    const serverMsg = err?.status === 422 ? err?.error?.message : null;
    this.message = { type: 'error', text: serverMsg || this.translate.instant(fallbackKey) };
    this.cdr.detectChanges();
  }
}
