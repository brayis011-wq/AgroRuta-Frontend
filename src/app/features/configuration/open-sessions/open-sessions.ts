import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeguridadService, SesionAbierta } from '../../../core/services/security.service';

/** Dispositivos donde la cuenta tiene la sesión iniciada, con la opción de cerrarlos a distancia. */
@Component({
  selector: 'app-open-sessions',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './open-sessions.html',
  styleUrls: ['../../crop/crop-ui.css', '../../crop/crop-blocks.css', '../security.css'],
})
export class OpenSessionsComponent implements OnInit {
  private seguridad = inject(SeguridadService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private idioma = inject(LanguageService);

  /** null mientras carga */
  readonly sesiones = signal<SesionAbierta[] | null>(null);
  readonly sinDatos = signal(false);
  /** Id de la sesión que se está cerrando, o 'otras' */
  readonly cerrando = signal<number | 'otras' | null>(null);
  readonly error = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.seguridad.sesiones().subscribe({
      next: (lista) => {
        this.sinDatos.set(false);
        // La de este navegador primero; después, la más usada recientemente
        this.sesiones.set([...lista].sort((a, b) => Number(b.actual) - Number(a.actual) || b.ultimoUso.localeCompare(a.ultimoUso)));
      },
      error: () => this.sinDatos.set(true),
    });
  }

  get hayOtras(): boolean {
    return (this.sesiones() ?? []).some((s) => !s.actual);
  }

  cerrar(sesion: SesionAbierta): void {
    if (this.cerrando() !== null) return;
    this.cerrando.set(sesion.id);
    this.error.set(false);
    this.seguridad.cerrarSesion(sesion.id).subscribe({
      next: () => {
        this.cerrando.set(null);
        if (sesion.actual) {
          // El servidor ya borró la cookie: aquí solo queda soltar lo que hay en memoria
          this.auth.olvidarSesion();
          this.router.navigate(['/auth/login']);
          return;
        }
        this.sesiones.update((lista) => (lista ?? []).filter((s) => s.id !== sesion.id));
      },
      error: () => {
        this.cerrando.set(null);
        this.error.set(true);
      },
    });
  }

  cerrarOtras(): void {
    if (this.cerrando() !== null) return;
    this.cerrando.set('otras');
    this.error.set(false);
    this.seguridad.cerrarOtras().subscribe({
      next: () => {
        this.cerrando.set(null);
        this.sesiones.update((lista) => (lista ?? []).filter((s) => s.actual));
      },
      error: () => {
        this.cerrando.set(null);
        this.error.set(true);
      },
    });
  }

  esMovil(sesion: SesionAbierta): boolean {
    return /android|iphone|ipad|ios/i.test(sesion.dispositivo ?? '');
  }

  fecha(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(this.idioma.current() === 'en' ? 'en-US' : 'es-CO', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
  }
}
