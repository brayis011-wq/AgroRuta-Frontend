import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Trabajador } from '../../../core/models/worker.model';
import { iniciales as inicialesDe } from '../../../shared/iniciales';

/** Con más trabajadores que esto, el filtro pasa de fichas a una lista desplegable */
export const MAX_FICHAS = 6;

/**
 * Filtro de Jornales, Nóminas y Pagos: ver lo de todo el equipo o lo de un trabajador.
 * Con pocos trabajadores son fichas que se tocan; con muchos, una lista desplegable.
 */
@Component({
  selector: 'app-filtro-trabajador',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './worker-filter.html',
  styleUrl: './worker-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltroTrabajadorComponent {
  readonly trabajadores = input<Trabajador[]>([]);
  /** Trabajador elegido; null = todos */
  readonly valor = input<number | null>(null);
  readonly cambio = output<number | null>();

  readonly fichas = computed(() => this.trabajadores().length <= MAX_FICHAS);
  /** Los activos primero; los demás se siguen pudiendo ver (tienen jornales y pagos viejos) */
  readonly ordenados = computed(() => [...this.trabajadores()].sort((a, b) =>
    Number(a.estado !== 'ACTIVO') - Number(b.estado !== 'ACTIVO')
    || (a.nombreCompleto ?? '').localeCompare(b.nombreCompleto ?? '')));

  elegir(id: number | null): void {
    if (id !== this.valor()) this.cambio.emit(id);
  }

  iniciales(t: Trabajador): string {
    return inicialesDe(t.nombre, t.apellido ?? null);
  }
}
