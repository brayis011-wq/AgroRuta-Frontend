import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { PasoInicial, siguientePaso } from './first-steps';

const CLAVE_OCULTO = 'primerosPasosOculto';

/** Recuerda en este navegador que la persona ocultó la tarjeta (por usuario) */
function leerOculto(usuarioId: number | null | undefined): boolean {
  try { return localStorage.getItem(`${CLAVE_OCULTO}:${usuarioId ?? ''}`) === '1'; } catch { return false; }
}

/**
 * "Primeros pasos" del inicio: finca → lote → siembra → trabajador → jornal.
 * Se ve mientras falte alguno; se puede ocultar y no vuelve a salir en este navegador.
 */
@Component({
  selector: 'app-primeros-pasos',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './first-steps-card.html',
  styleUrl: './first-steps-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Oculta la etiqueta entera, para que no deje el espacio de la tarjeta en el Inicio
  host: { '[class.oculto]': '!visible()' },
})
export class PrimerosPasosComponent {
  private readonly usuarioId = inject(AuthService).getUsuario()?.id;

  readonly pasos = input.required<PasoInicial[]>();

  readonly oculto = signal(leerOculto(this.usuarioId));
  readonly hechos = computed(() => this.pasos().filter((p) => p.hecho).length);
  readonly siguiente = computed(() => siguientePaso(this.pasos()));
  readonly visible = computed(() => !this.oculto() && this.siguiente() !== null);

  ocultar(): void {
    this.oculto.set(true);
    try { localStorage.setItem(`${CLAVE_OCULTO}:${this.usuarioId ?? ''}`, '1'); } catch { /* sin almacenamiento */ }
  }
}
