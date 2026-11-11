import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, input, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DiagnosticoService } from '../../../../core/services/diagnosis.service';
import { LanguageService } from '../../../../core/services/language.service';
import { DiagnosticoPlaga, DiagnosticosSiembra, TipoProblema } from '../../../../core/models/diagnosis.model';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { localeDe } from '../../../../shared/format';
import { reducirFoto, revisarArchivo } from '../../../../shared/photo';

const ICONO: Record<TipoProblema, string> = {
  PLAGA: 'ti-bug', ENFERMEDAD: 'ti-virus', DEFICIENCIA: 'ti-flask', DANO_AMBIENTAL: 'ti-sun', SANA: 'ti-leaf', INDETERMINADO: 'ti-help',
};
const TONO: Record<TipoProblema, string> = {
  PLAGA: 'ambar', ENFERMEDAD: 'rojo', DEFICIENCIA: 'azul', DANO_AMBIENTAL: 'ambar', SANA: 'verde', INDETERMINADO: 'gris',
};

/**
 * Diagnóstico con foto: la persona toma o elige una foto de la planta, se analiza en el
 * servidor y el resultado queda guardado en la siembra.
 */
@Component({
  selector: 'app-diagnostico-siembra',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './diagnosis.html',
  styleUrls: ['../../crop-ui.css', './diagnosis.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticoSiembraComponent implements OnDestroy {
  private servicio = inject(DiagnosticoService);
  private confirm = inject(ConfirmService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  readonly siembraId = input.required<number>();

  readonly estado = signal<DiagnosticosSiembra | null>(null);
  readonly cargando = signal(true);
  /** inicio: sin foto elegida · lista: foto elegida, falta analizar · analizando */
  readonly fase = signal<'inicio' | 'lista' | 'analizando'>('inicio');
  /** Dirección local de la foto elegida, para mostrarla antes de enviarla */
  readonly vista = signal<string | null>(null);
  readonly nota = signal('');
  /** Clave de traducción o mensaje que devolvió el servidor */
  readonly error = signal<string | null>(null);
  readonly abierto = signal<number | null>(null);
  /** Fotos ya traídas, por id de diagnóstico */
  readonly fotos = signal<Record<number, string>>({});

  private foto: Blob | null = null;

  constructor() {
    effect(() => {
      const id = this.siembraId();
      untracked(() => this.cargar(id));
    });
  }

  ngOnDestroy(): void {
    this.soltarVista();
    Object.values(this.fotos()).forEach((url) => URL.revokeObjectURL(url));
  }

  private cargar(id: number): void {
    this.cancelar();
    this.cargando.set(true);
    this.abierto.set(null);
    this.servicio.listar(id).subscribe({
      next: (e) => {
        if (this.siembraId() !== id) return;
        this.estado.set(e);
        this.cargando.set(false);
      },
      error: () => {
        if (this.siembraId() !== id) return;
        this.estado.set(null);
        this.cargando.set(false);
      },
    });
  }

  /** La persona tomó o eligió una foto */
  async elegir(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    campo.value = ''; // permite volver a elegir la misma foto
    if (!archivo) return;
    this.error.set(null);
    const problema = revisarArchivo(archivo);
    if (problema) {
      this.error.set('diagnostico.errors.' + problema);
      return;
    }
    try {
      // Se reduce aquí mismo: sube rápido con poca señal y gasta menos datos
      this.usar(await reducirFoto(archivo));
    } catch {
      this.error.set('diagnostico.errors.lectura');
    }
  }

  usar(foto: Blob): void {
    this.soltarVista();
    this.foto = foto;
    this.vista.set(URL.createObjectURL(foto));
    this.fase.set('lista');
  }

  cancelar(): void {
    this.soltarVista();
    this.foto = null;
    this.nota.set('');
    this.error.set(null);
    this.fase.set('inicio');
  }

  analizar(): void {
    const foto = this.foto;
    const id = this.siembraId();
    if (!foto || this.fase() === 'analizando') return;
    this.fase.set('analizando');
    this.error.set(null);
    this.servicio.diagnosticar(id, foto, this.nota()).subscribe({
      next: (d) => {
        const antes = this.estado();
        this.estado.set({
          disponible: true,
          restantesHoy: Math.max(0, (antes?.restantesHoy ?? 1) - 1),
          diagnosticos: [d, ...(antes?.diagnosticos ?? [])],
        });
        // La foto recién analizada ya está en el dispositivo: no hace falta pedirla al servidor
        const url = this.vista();
        if (url) this.fotos.update((f) => ({ ...f, [d.id]: url }));
        this.vista.set(null);
        this.foto = null;
        this.nota.set('');
        this.fase.set('inicio');
        this.abierto.set(d.id);
      },
      error: (e: HttpErrorResponse) => {
        this.fase.set('lista');
        if (e.status === 0) {
          this.error.set('diagnostico.errors.offline');
          return;
        }
        this.error.set(e.error?.message || 'diagnostico.errors.generic');
        // Una foto que no sirvió también gasta un análisis: se trae la cuenta al día
        this.servicio.listar(id).subscribe({
          next: (actual) => { if (this.siembraId() === id) this.estado.set(actual); },
          error: () => undefined,
        });
      },
    });
  }

  alternar(d: DiagnosticoPlaga): void {
    const abrir = this.abierto() !== d.id;
    this.abierto.set(abrir ? d.id : null);
    if (!abrir || this.fotos()[d.id]) return;
    this.servicio.foto(this.siembraId(), d.id).subscribe({
      next: (blob) => this.fotos.update((f) => ({ ...f, [d.id]: URL.createObjectURL(blob) })),
      error: () => undefined, // el texto del diagnóstico se ve igual sin la foto
    });
  }

  async eliminar(d: DiagnosticoPlaga): Promise<void> {
    const ok = await this.confirm.preguntar({
      titulo: this.translate.instant('diagnostico.deleteTitle'),
      mensaje: this.translate.instant('diagnostico.deleteMsg', { nombre: d.problema }),
      confirmar: this.translate.instant('diagnostico.delete'),
      peligro: true,
    });
    if (!ok) return;
    this.servicio.eliminar(this.siembraId(), d.id).subscribe({
      next: () => {
        const actual = this.estado();
        if (actual) this.estado.set({ ...actual, diagnosticos: actual.diagnosticos.filter((x) => x.id !== d.id) });
        const url = this.fotos()[d.id];
        if (url) {
          URL.revokeObjectURL(url);
          this.fotos.update((f) => { const { [d.id]: _, ...resto } = f; return resto; });
        }
      },
      error: (e: HttpErrorResponse) => this.error.set(e.status === 0 ? 'diagnostico.errors.offline' : 'diagnostico.errors.delete'),
    });
  }

  icono(tipo: TipoProblema): string {
    return ICONO[tipo] ?? ICONO.INDETERMINADO;
  }

  tono(tipo: TipoProblema): string {
    return TONO[tipo] ?? TONO.INDETERMINADO;
  }

  /** "11 nov 2026, 10:00 a. m." */
  fecha(valor: string): string {
    const f = new Date(valor);
    if (Number.isNaN(f.getTime())) return '';
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(f);
  }

  private soltarVista(): void {
    const url = this.vista();
    // Si ya quedó como foto de un diagnóstico, se sigue usando
    if (url && !Object.values(this.fotos()).includes(url)) URL.revokeObjectURL(url);
    this.vista.set(null);
  }
}
