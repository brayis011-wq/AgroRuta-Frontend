import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

/** "Olvidé mi contraseña": pide el correo y manda el enlace. */
@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrls: ['../auth-form.css', '../auth-recovery.css'],
})
export class RecuperarComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  email = '';
  readonly cargando = signal(false);
  readonly enviado = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
  }

  enviar(): void {
    const email = this.email.trim();
    if (!email || this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    this.auth.recuperar(email).subscribe({
      next: () => {
        this.cargando.set(false);
        this.enviado.set(true);
      },
      error: (err: { status?: number }) => {
        this.cargando.set(false);
        this.error.set(err?.status === 400 ? 'auth.forgot.invalidEmail' : 'auth.login.serverError');
      },
    });
  }

  /** Volver a escribir el correo (por si se equivocó) */
  otraVez(): void {
    this.enviado.set(false);
  }
}
