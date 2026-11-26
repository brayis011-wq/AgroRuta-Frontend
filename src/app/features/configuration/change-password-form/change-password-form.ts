import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ChangePasswordRequest } from '../../../core/models/profile.model';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('nuevaPassword')?.value;
  const confirmar = group.get('confirmarPassword')?.value;
  return nueva && confirmar && nueva !== confirmar ? { mismatch: true } : null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-change-password-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './change-password-form.html',
  styleUrls: ['../config-fields.css', './change-password-form.scss'],
})
export class ChangePasswordFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly loading = input(false);
  readonly changePassword = output<ChangePasswordRequest>();

  form: FormGroup;
  showActual = false;
  showNueva = false;
  showConfirmar = false;

  constructor() {
    this.form = this.fb.group(
      {
        passwordActual: ['', [Validators.required]],
        nuevaPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmarPassword: ['', [Validators.required]],
      },
      { validators: passwordsMatch },
    );
  }

  get mismatch(): boolean {
    return !!(this.form.hasError('mismatch') && this.form.get('confirmarPassword')?.touched);
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { passwordActual, nuevaPassword } = this.form.value;
    this.changePassword.emit({ passwordActual, nuevaPassword });
  }

  /** Se llama cuando el servidor confirma el cambio; si falla, lo escrito se conserva */
  limpiar(): void {
    this.form.reset();
    this.showActual = this.showNueva = this.showConfirmar = false;
  }

  /** Qué cumple la nueva contraseña (guía para el usuario; el servidor exige mínimo 8) */
  get reglas(): { clave: string; ok: boolean }[] {
    const v: string = this.form.get('nuevaPassword')?.value || '';
    return [
      { clave: 'length', ok: v.length >= 8 },
      { clave: 'upper', ok: /[A-ZÁÉÍÓÚÑ]/.test(v) },
      { clave: 'number', ok: /\d/.test(v) },
      { clave: 'symbol', ok: /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(v) },
    ];
  }

  /** 0 vacía, 1 débil, 2 regular, 3 buena, 4 fuerte */
  get fuerza(): number {
    const v: string = this.form.get('nuevaPassword')?.value || '';
    if (!v) return 0;
    const cumple = this.reglas.filter((r) => r.ok).length;
    if (v.length < 8) return 1;
    return Math.max(1, Math.min(4, cumple + (v.length >= 12 ? 1 : 0)));
  }
}
