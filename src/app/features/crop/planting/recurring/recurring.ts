import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CampoService } from '../../../../core/services/finance.service';
import { LaborProgramada, TIPOS_PROGRAMABLES, TipoProgramable } from '../../../../core/models/finance.model';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { AvisosService } from '../../../../core/services/toast.service';
import { FechaPipe } from '../../../../shared/format.pipe';
import { iso } from '../../calendar/events';

interface Borrador { id: number | null; tipo: TipoProgramable; cadaDias: number | null; desde: string; hasta: string; descripcion: string }

/** Labores que se repiten en la siembra: "fertilizar cada 30 días" (salen en el calendario y en los avisos) */
@Component({
  selector: 'app-labores-repetidas',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, FechaPipe],
  templateUrl: './recurring.html',
  styleUrl: './recurring.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaboresRepetidasComponent {
  private readonly campo = inject(CampoService);
  private readonly confirm = inject(ConfirmService);
  private readonly avisos = inject(AvisosService);
  private readonly translate = inject(TranslateService);

  readonly siembraId = input.required<number>();
  readonly activa = input(true);
  readonly version = input(0);

  readonly lista = signal<LaborProgramada[] | null>(null);
  readonly borrador = signal<Borrador | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly tipos = TIPOS_PROGRAMABLES;
  /** Intervalos típicos para elegir con un toque */
  readonly sugeridos = [7, 15, 30, 45, 60, 90];
  readonly hoy = iso(new Date());

  constructor() {
    effect(() => {
      const id = this.siembraId();
      this.version();
      this.cargar(id);
    });
  }

  private cargar(id: number): void {
    this.campo.programadas(id).subscribe({
      next: (l) => this.lista.set(l),
      error: () => this.lista.set([]),
    });
  }

  nueva(): void {
    this.error.set(null);
    this.borrador.set({ id: null, tipo: 'FERTILIZACION', cadaDias: 30, desde: this.hoy, hasta: '', descripcion: '' });
  }

  editar(p: LaborProgramada): void {
    this.error.set(null);
    this.borrador.set({ id: p.id, tipo: p.tipo, cadaDias: p.cadaDias, desde: p.desde, hasta: p.hasta ?? '', descripcion: p.descripcion ?? '' });
  }

  cambiar<K extends keyof Borrador>(campo: K, valor: Borrador[K]): void {
    const b = this.borrador();
    if (b) this.borrador.set({ ...b, [campo]: valor });
  }

  guardar(): void {
    const b = this.borrador();
    if (!b || !b.cadaDias || b.cadaDias < 1 || !b.desde) { this.error.set('temporadas.repetir.errors.incomplete'); return; }
    this.guardando.set(true);
    const req = { tipo: b.tipo, cadaDias: Number(b.cadaDias), desde: b.desde, hasta: b.hasta || null, descripcion: b.descripcion || null };
    const op = b.id ? this.campo.actualizarProgramada(b.id, req) : this.campo.crearProgramada(this.siembraId(), req);
    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.borrador.set(null);
        this.avisos.exito('temporadas.repetir.saved');
        this.cargar(this.siembraId());
      },
      error: (e) => { this.guardando.set(false); this.error.set(e?.error?.message || 'temporadas.repetir.errors.save'); },
    });
  }

  async quitar(p: LaborProgramada): Promise<void> {
    const ok = await this.confirm.preguntar({
      mensaje: this.translate.instant('temporadas.repetir.confirmDelete', { labor: this.translate.instant('enums.tipoActividad.' + p.tipo) }),
      peligro: true,
    });
    if (!ok) return;
    this.campo.eliminarProgramada(p.id).subscribe({ next: () => this.cargar(this.siembraId()) });
  }

  /** Para hacerla ahora: abre el formulario que la cumple */
  registrar(p: LaborProgramada): { ruta: string; query: Record<string, string> } {
    if (p.tipo === 'FERTILIZACION' || p.tipo === 'FUMIGACION') return { ruta: 'spraying', query: {} };
    return { ruta: 'activity', query: { tipo: p.tipo } };
  }
}
