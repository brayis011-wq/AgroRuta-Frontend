import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Perfil, UpdateProfileRequest } from '../../../core/models/profile.model';
import { ErrorFoto, prepararFoto, revisarArchivo } from '../../../shared/photo';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile-form.html',
  styleUrls: ['../config-fields.css', './profile-form.scss'],
})
export class ProfileFormComponent implements OnChanges {
  @Input() perfil: Perfil | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<UpdateProfileRequest>();

  private readonly cdr = inject(ChangeDetectorRef);

  form: FormGroup;
  imageError = false;
  /** Mientras se reduce la foto elegida */
  readonly procesando = signal(false);
  /** Motivo por el que no se pudo usar la foto elegida */
  readonly errorFoto = signal<ErrorFoto | null>(null);
  /** Hay un archivo encima del recuadro de la foto */
  readonly arrastrando = signal(false);

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
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }
  }

  /** Vuelve a los datos guardados */
  descartar(): void {
    if (!this.perfil) return;
    this.form.patchValue({ nombre: this.perfil.nombre, telefono: this.perfil.telefono, fotoPerfil: this.perfil.fotoPerfil });
    this.imageError = false;
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  quitarFoto(): void {
    this.form.patchValue({ fotoPerfil: '' });
    this.form.get('fotoPerfil')?.markAsDirty();
    this.imageError = false;
    this.errorFoto.set(null);
  }

  /** Foto elegida con el botón o soltada sobre el recuadro */
  async usarArchivo(archivo: File | null | undefined): Promise<void> {
    this.arrastrando.set(false);
    if (!archivo) return;
    const problema = revisarArchivo(archivo);
    if (problema) { this.errorFoto.set(problema); return; }
    this.errorFoto.set(null);
    this.procesando.set(true);
    try {
      const foto = await prepararFoto(archivo);
      this.form.patchValue({ fotoPerfil: foto });
      this.form.get('fotoPerfil')?.markAsDirty();
      this.imageError = false;
    } catch (e) {
      this.errorFoto.set(e === 'pesada' ? 'pesada' : 'lectura');
    } finally {
      this.procesando.set(false);
      this.cdr.markForCheck();
    }
  }

  alElegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.usarArchivo(entrada.files?.[0]);
    entrada.value = ''; // permite volver a elegir el mismo archivo
  }

  alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.usarArchivo(evento.dataTransfer?.files?.[0]);
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
