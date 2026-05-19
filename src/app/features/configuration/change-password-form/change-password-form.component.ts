import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ChangePasswordRequest } from '../../../core/models/profile.model';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('nuevaPassword')?.value;
  const confirmar = group.get('confirmarPassword')?.value;
  return nueva && confirmar && nueva !== confirmar ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password-form.component.html',
  styleUrls: ['./change-password-form.component.scss'],
})
export class ChangePasswordFormComponent {
  @Input() loading = false;
  @Output() changePassword = new EventEmitter<ChangePasswordRequest>();

  form: FormGroup;
  showActual = false;
  showNueva = false;
  showConfirmar = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group(
      {
        passwordActual: ['', [Validators.required]],
        nuevaPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmarPassword: ['', [Validators.required]],
      },
      { validators: passwordsMatch }
    );
  }

  get mismatch(): boolean {
    return !!(
      this.form.hasError('mismatch') &&
      this.form.get('confirmarPassword')?.touched
    );
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
    this.form.reset();
  }
}
