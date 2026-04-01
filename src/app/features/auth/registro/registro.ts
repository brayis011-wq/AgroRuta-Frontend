import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { RegisterRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class RegistroComponent {
  form: RegisterRequest = {
    nombre: '',
    email: '',
    password: '',
    rol: 'Agricultor',
  };

  error: string = '';
  exito: string = '';
  cargando: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  onSubmit(): void {
    this.error = '';
    this.exito = '';
    this.cargando = true;

    this.authService.registro(this.form).subscribe({
      next: () => {
        this.cargando = false;
        this.exito = '¡Usuario registrado exitosamente! Redirigiendo...';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al registrar usuario.';
        this.cdr.detectChanges();
      },
    });
  }
}
