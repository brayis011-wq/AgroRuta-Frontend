import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { inicioPorRol } from '../../../core/guards/rol-guards';
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

    this.authService.login(this.form).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.router.navigate([inicioPorRol(respuesta.rol)]);
      },
      error: (err) => {
        this.cargando = false;
        const cuentaDesactivada = err.status === 401 && /desactivada/i.test(err.error?.message ?? '');
        this.error = cuentaDesactivada
          ? 'auth.login.accountDisabled'
          : err.status === 429
            ? 'auth.login.tooManyAttempts'
          : err.status === 401 || err.status === 403
            ? 'auth.login.invalidCredentials'
            : 'auth.login.serverError';
        this.cdr.detectChanges();
      },
    });
  }
}
