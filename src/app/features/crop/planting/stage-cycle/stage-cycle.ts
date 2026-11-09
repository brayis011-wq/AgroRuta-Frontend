import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/crop.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { formatoFecha } from '../../../../shared/format';
import { EtapaSiembra, Siembra, siembraActiva } from '../../../../core/models/crop.model';
import {
  diasEnEtapa, diasEntre, fechaMinima, hoyIso, pasosCiclo, progresoCiclo, siguienteEtapa,
} from './stage-cycle.logic';

type Panel = 'avanzar' | 'terminar' | null;

/**
 * Ciclo de la siembra: las cinco etapas con la fecha de cada cambio,
 * y los botones para pasar a la siguiente, deshacer o terminar la temporada.
 */
@Component({
  selector: 'app-ciclo-etapas',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './stage-cycle.html',
  styleUrl: './stage-cycle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CicloEtapasComponent {
  private cultivo = inject(CultivoService);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);
  private confirm = inject(ConfirmService);

  readonly siembra = input.required<Siembra>();
  /** Sin botones (p. ej. en el historial) */
  readonly soloLectura = input(false);
  /** La siembra cambió de etapa o se cerró */
  readonly cambio = output<Siembra>();

  readonly etapas = signal<EtapaSiembra[]>([]);
  readonly panel = signal<Panel>(null);
  readonly guardando = signal(false);
  readonly error = signal('');

  fecha = hoyIso();
  dejarEnDescanso = false;
  readonly hoy = hoyIso();

  readonly activa = computed(() => siembraActiva(this.siembra()));
  readonly pasos = computed(() => pasosCiclo(this.siembra(), this.etapas()));
  readonly siguiente = computed(() => siguienteEtapa(this.siembra().estadoCultivo));
  readonly minimo = computed(() => fechaMinima(this.siembra(), this.etapas()));
  readonly diasEtapa = computed(() => diasEnEtapa(this.siembra(), this.etapas()));
  readonly duracion = computed(() => diasEntre(this.siembra().fechaSiembra, this.siembra().fechaFin ?? this.hoy));
  readonly puedeDeshacer = computed(() => this.siembra().estadoCultivo !== 'GERMINACION');
  /** Avance de la línea hasta el punto de la etapa actual */
  readonly progreso = computed(() => progresoCiclo(this.siembra().estadoCultivo));

  constructor() {
    let cargada = '';
    effect(() => {
      const s = this.siembra();
      // se recargan las fechas cuando cambia la siembra o su etapa
      const clave = `${s.id}-${s.estadoCultivo}`;
      if (!s.id || clave === cargada) return;
      cargada = clave;
      this.cultivo.etapasSiembra(s.id).subscribe({
        next: (e) => this.etapas.set(e),
        error: () => this.etapas.set([]),
      });
    });
  }

  fmt(f: string | null): string {
    return f ? formatoFecha(f, this.lang.current()) : '';
  }

  abrir(p: Panel): void {
    this.error.set('');
    this.fecha = this.hoy;
    this.dejarEnDescanso = false;
    this.panel.set(this.panel() === p ? null : p);
  }

  avanzar(): void {
    const s = this.siembra();
    if (!s.id || this.guardando()) return;
    this.ejecutar(this.cultivo.avanzarEtapa(s.id, this.fecha));
  }

  terminar(): void {
    const s = this.siembra();
    if (!s.id || this.guardando()) return;
    this.ejecutar(this.cultivo.finalizarSiembra(s.id, this.fecha, this.dejarEnDescanso));
  }

  async deshacer(): Promise<void> {
    const s = this.siembra();
    if (!s.id || this.guardando()) return;
    const reabrir = !this.activa();
    const ok = await this.confirm.preguntar({
      titulo: this.translate.instant(reabrir ? 'temporadas.ciclo.reopenTitle' : 'temporadas.ciclo.undoTitle'),
      mensaje: this.translate.instant(reabrir ? 'temporadas.ciclo.reopenMsg' : 'temporadas.ciclo.undoMsg', {
        etapa: this.translate.instant('enums.etapaCultivo.' + s.estadoCultivo),
      }),
      confirmar: this.translate.instant(reabrir ? 'temporadas.ciclo.reopen' : 'temporadas.ciclo.undo'),
    });
    if (ok) this.ejecutar(this.cultivo.retrocederEtapa(s.id));
  }

  private ejecutar(peticion: ReturnType<CultivoService['retrocederEtapa']>): void {
    this.guardando.set(true);
    this.error.set('');
    peticion.subscribe({
      next: (s) => {
        this.guardando.set(false);
        this.panel.set(null);
        this.cambio.emit(s);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'temporadas.ciclo.error');
      },
    });
  }
}
