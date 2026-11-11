import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ColaSinConexionService } from '../../../core/offline/offline-queue.service';
import { Pendiente } from '../../../core/offline/offline-store';
import { LanguageService } from '../../../core/services/language.service';

const ICONOS: Record<string, string> = {
  jornal: 'ti-clock-hour-4',
  fumigacion: 'ti-spray',
  cosecha: 'ti-basket',
  actividad: 'ti-shovel',
};
/** La cosecha cae dentro de la carencia de una fumigación: se puede enviar confirmándolo */
const EN_CARENCIA = 'AGR-012';
const AVISO_MS = 6000;

/**
 * Indicador del modo sin conexión: avisa cuando no hay señal, cuántos registros esperan
 * en el dispositivo y deja enviarlos, reintentarlos o descartarlos.
 */
@Component({
  selector: 'app-offline-status',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './offline-status.html',
  styleUrl: './offline-status.css',
})
export class OfflineStatusComponent implements OnInit {
  readonly cola = inject(ColaSinConexionService);
  private idioma = inject(LanguageService);

  readonly abierto = signal(false);
  /** Aviso pasajero: 'guardado' (quedó en el dispositivo) o 'enviados' (ya llegaron al servidor) */
  readonly aviso = signal<'guardado' | 'enviados' | null>(null);
  /** Registro que pidió confirmación para descartarse */
  readonly porDescartar = signal<string | null>(null);

  readonly visible = computed(() => !this.cola.enLinea() || this.cola.pendientes().length > 0 || this.aviso() !== null);

  private reloj: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.cola.guardados() > 0) untracked(() => this.avisar('guardado'));
    });
    effect(() => {
      if (this.cola.enviados() > 0) untracked(() => this.avisar('enviados'));
    });
    effect(() => {
      // Sin nada que mostrar el panel se cierra solo
      if (!this.visible()) untracked(() => this.abierto.set(false));
    });
  }

  ngOnInit(): void {
    this.cola.iniciar();
  }

  private avisar(tipo: 'guardado' | 'enviados'): void {
    this.aviso.set(tipo);
    if (this.reloj) clearTimeout(this.reloj);
    this.reloj = setTimeout(() => {
      this.aviso.set(null);
      if (tipo === 'enviados') this.cola.enviados.set(0);
    }, AVISO_MS);
  }

  alternar(): void {
    this.porDescartar.set(null);
    this.abierto.update((a) => !a);
  }

  enviar(): void {
    void this.cola.sincronizar();
  }

  /** Dos toques para descartar: el registro solo existe en este dispositivo */
  descartar(p: Pendiente): void {
    if (this.porDescartar() !== p.id) {
      this.porDescartar.set(p.id);
      return;
    }
    this.porDescartar.set(null);
    void this.cola.descartar(p.id);
  }

  reintentar(p: Pendiente): void {
    void this.cola.reintentar(p.id);
  }

  esCarencia(p: Pendiente): boolean {
    return p.codigoError === EN_CARENCIA;
  }

  confirmarCarencia(p: Pendiente): void {
    void this.cola.reintentar(p.id, { confirmarCarencia: true });
  }

  icono(p: Pendiente): string {
    return ICONOS[p.tipo] ?? 'ti-file';
  }

  /** Los mensajes del servidor llegan ya redactados; los propios son claves de traducción */
  esClave(texto: string | undefined): boolean {
    return !!texto && texto.startsWith('offline.');
  }

  fecha(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(this.idioma.current() === 'en' ? 'en-US' : 'es-CO', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
  }
}
