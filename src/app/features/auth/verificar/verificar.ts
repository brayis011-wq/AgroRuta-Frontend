import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { inicioPorRol } from '../../../core/guards/rol-guards';

/** Página del enlace de confirmación del correo: confirma la cuenta y entra. */
@Component({
  selector: 'app-verificar',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './verificar.html',
  styleUrls: ['../auth-form.css', '../auth-recuperar.css'],
})
export class VerificarComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly estado = signal<'confirmando' | 'listo' | 'malo' | 'error'>('confirmando');
  email = '';
  readonly reenviando = signal(false);
  readonly reenviado = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.estado.set('malo');
      return;
    }
    this.auth.verificar(token).subscribe({
      next: (r) => {
        this.estado.set('listo');
        setTimeout(() => this.router.navigate([inicioPorRol(r.rol)]), 1500);
      },
      error: (err: { status?: number }) => this.estado.set(err?.status === 422 ? 'malo' : 'error'),
    });
  }

  reenviar(): void {
    const email = this.email.trim();
    if (!email || this.reenviando()) return;
    this.reenviando.set(true);
    this.auth.reenviarVerificacion(email).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.reenviado.set(true);
      },
      error: () => {
        this.reenviando.set(false);
        this.estado.set('error');
      },
    });
  }
}
