import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Perfil, UpdateProfileRequest } from '../../../core/models/profile.model';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile-form.component.html',
  styleUrls: ['./profile-form.component.scss'],
})
export class ProfileFormComponent implements OnChanges {
  @Input() perfil: Perfil | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<UpdateProfileRequest>();

  form: FormGroup;
  imageError = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
      fotoPerfil: [''],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['perfil'] && this.perfil) {
      this.form.patchValue({
        nombre: this.perfil.nombre,
        email: this.perfil.email,
        telefono: this.perfil.telefono,
        fotoPerfil: this.perfil.fotoPerfil,
      });
      this.imageError = false;
    }
  }

  get fotoUrl(): string {
    return this.form.get('fotoPerfil')?.value || '';
  }

  get hasValidImage(): boolean {
    return !!this.fotoUrl && !this.imageError;
  }

  get initials(): string {
    const nombre: string = this.form.get('nombre')?.value || '';
    return nombre
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  onImageError(): void {
    this.imageError = true;
  }

  onFotoChange(): void {
    this.imageError = false;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, telefono, fotoPerfil } = this.form.getRawValue();
    this.save.emit({ nombre, telefono, fotoPerfil });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }
}
