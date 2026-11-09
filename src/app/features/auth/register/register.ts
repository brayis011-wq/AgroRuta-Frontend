import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrls: ['../auth-form.css', '../auth-recovery.css'],
})
export class RegistroComponent {
  verPass = false;

  form: RegisterRequest = {
    nombre: '',
    email: '',
    password: '',
    rol: 'Agricultor',
    cedula: '',
  };

  error: string = '';
  exito: string = '';
  cargando: boolean = false;
  /** Correo al que se mandó el enlace de confirmación (la cuenta ya se creó) */
  pendiente = '';
  trabajador = false;
  reenviando = false;
  reenviado = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  onSubmit(): void {
    this.error = '';
    this.exito = '';
    this.cargando = true;

    const esTrabajador = this.form.rol === 'Trabajador';
    if (esTrabajador && !this.form.cedula?.trim()) {
      this.cargando = false;
      this.error = 'auth.register.cedulaRequired';
      return;
    }
    const datos = { ...this.form, cedula: esTrabajador ? this.form.cedula?.trim() : undefined };

    this.authService.registro(datos).subscribe({
      next: (r) => {
        this.cargando = false;
        if (r?.verificacionPendiente) {
          this.pendiente = r.email || datos.email.trim();
          this.trabajador = esTrabajador;
          this.cdr.detectChanges();
          return;
        }
        this.exito = esTrabajador ? 'auth.register.successWorker' : 'auth.register.success';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, esTrabajador ? 4000 : 2000);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'auth.register.error';
        this.cdr.detectChanges();
      },
    });
  }

  /** Por si el correo no llegó */
  reenviar(): void {
    if (!this.pendiente || this.reenviando) return;
    this.reenviando = true;
    this.authService.reenviarVerificacion(this.pendiente).subscribe({
      next: () => {
        this.reenviando = false;
        this.reenviado = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reenviando = false;
        this.error = 'auth.login.serverError';
        this.cdr.detectChanges();
      },
    });
  }
}
