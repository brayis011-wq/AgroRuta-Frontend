import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

/** Página del enlace del correo: crea la contraseña nueva. */
@Component({
  selector: 'app-restablecer',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './reset-password.html',
  styleUrls: ['../auth-form.css', '../auth-recovery.css'],
})
export class RestablecerComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  static readonly MIN = 8;
  static readonly MAX = 72;

  readonly token = signal('');
  readonly password = signal('');
  readonly confirmar = signal('');
  readonly verPass = signal(false);
  readonly cargando = signal(false);
  readonly error = signal('');
  /** El enlace ya no sirve: se ofrece pedir otro */
  readonly enlaceMalo = signal(false);

  readonly problema = computed(() => {
    const p = this.password();
    if (!p) return '';
    if (p.length < RestablecerComponent.MIN || p.length > RestablecerComponent.MAX) return 'auth.reset.length';
    if (this.confirmar() && this.confirmar() !== p) return 'auth.reset.mismatch';
    return '';
  });

  readonly listo = computed(() =>
    !!this.token() && this.password().length >= RestablecerComponent.MIN
    && this.password().length <= RestablecerComponent.MAX && this.password() === this.confirmar());

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(token);
    if (!token) this.enlaceMalo.set(true);
  }

  guardar(): void {
    if (!this.listo() || this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    this.auth.restablecer(this.token(), this.password()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/auth/login'], { queryParams: { clave: 'nueva' } });
      },
      error: (err: { status?: number }) => {
        this.cargando.set(false);
        if (err?.status === 422) {
          this.enlaceMalo.set(true);
        } else {
          this.error.set(err?.status === 400 ? 'auth.reset.length' : 'auth.login.serverError');
        }
      },
    });
  }
}
