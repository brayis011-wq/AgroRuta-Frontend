import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { inicioPorRol } from '../../../core/guards/role-guards';
import { LoginRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: '../auth-form.css',
})
export class LoginComponent implements OnInit {
  verPass = false;

  form: LoginRequest = {
    email: '',
    password: '',
  };

  error: string = '';
  /** Mensaje de éxito (por ejemplo, después de crear una contraseña nueva) */
  aviso = '';
  /** La contraseña era correcta pero falta confirmar el correo */
  sinConfirmar = false;
  reenviado = false;
  /** La contraseña era correcta y la cuenta pide además el código de la verificación en dos pasos */
  pideCodigo = false;
  codigo = '';
  cargando: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // El interceptor redirige aquí con ?sesion=expirada cuando el servidor responde 401
    if (this.route.snapshot.queryParamMap.get('sesion') === 'expirada') {
      this.error = 'auth.login.sessionExpired';
    }
    if (this.route.snapshot.queryParamMap.get('clave') === 'nueva') {
      this.aviso = 'auth.reset.done';
    }
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.email = email;
  }

  onSubmit(): void {
    this.error = '';
    this.cargando = true;

    const codigo = this.codigo.trim();
    const datos = this.pideCodigo && codigo ? { ...this.form, codigo } : this.form;

    this.authService.login(datos).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.router.navigate([inicioPorRol(respuesta.rol)]);
      },
      error: (err) => {
        this.cargando = false;
        const cuentaDesactivada = err.status === 401 && /desactivada/i.test(err.error?.message ?? '');
        this.sinConfirmar = err.status === 403 && err.error?.errorCode === 'AGR-033';
        this.reenviado = false;
        const faltaCodigo = err.status === 403 && err.error?.errorCode === 'AGR-034';
        const codigoMalo = err.error?.errorCode === 'AGR-035';
        if (faltaCodigo) {
          // No es un error: la contraseña estuvo bien y ahora toca el segundo paso
          this.pideCodigo = true;
          this.codigo = '';
          this.aviso = 'auth.login.codeNeeded';
          this.cdr.detectChanges();
          return;
        }
        if (codigoMalo) this.codigo = '';
        else if (err.status !== 429) this.pideCodigo = false;
        this.error = cuentaDesactivada
          ? 'auth.login.accountDisabled'
          : codigoMalo
            ? 'auth.login.codeWrong'
          : this.sinConfirmar
            ? 'auth.login.notVerified'
          : err.status === 429
            ? 'auth.login.tooManyAttempts'
          : err.status === 401 || err.status === 403
            ? 'auth.login.invalidCredentials'
            : 'auth.login.serverError';
        this.cdr.detectChanges();
      },
    });
  }

  /** Vuelve a mandar el correo de confirmación */
  reenviarConfirmacion(): void {
    const email = this.form.email.trim();
    if (!email) return;
    this.authService.reenviarVerificacion(email).subscribe({
      next: () => {
        this.reenviado = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'auth.login.serverError';
        this.sinConfirmar = false;
        this.cdr.detectChanges();
      },
    });
  }
}
