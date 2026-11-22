import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import {
  CasillaPlanilla, CultivoDisponible, FilaPlanilla, JornalService, LaborService, Planilla,
} from '../../../core/services/worker.service';
import { Labor } from '../../../core/models/worker.model';
import { UltimoUsadoService } from '../../../core/services/last-used.service';
import { AvisosService } from '../../../core/services/toast.service';
import { PeriodoPipe, PesosPipe } from '../../../shared/format.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { localeDe } from '../../../shared/format';
import { clave, deIso, diasDeSemana, indexar, isoLocal, lunesDe, porQuitar, sumarDias, totalDia, totalFila } from './sheet.logic';

/** Lo que se recuerda de la planilla: el cultivo y las labores con que se anota */
interface UltimaPlanilla { cultivoId?: number; actividadIds?: number[] }

/** Casilla esperando los kilos (trabajadores que se pagan por kilo) */
interface PidiendoKilos { trabajador: FilaPlanilla; fecha: string; kilos: number | null }

/**
 * Planilla semanal: trabajadores por días. Un toque en una casilla anota el jornal con el cultivo y
 * las labores elegidos arriba; otro toque lo quita (se puede deshacer).
 */
@Component({
  selector: 'app-planilla',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, PesosPipe, PeriodoPipe],
  templateUrl: './sheet.html',
  styleUrls: ['../../crop/crop-ui.css', '../../crop/crop-blocks.css', '../worker-ui.css', '../worker-panel.css', './sheet.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanillaComponent implements OnInit {
  private readonly jornales = inject(JornalService);
  private readonly labores = inject(LaborService);
  private readonly ultimo = inject(UltimoUsadoService);
  private readonly avisos = inject(AvisosService);
  private readonly translate = inject(TranslateService);
  private readonly idioma = inject(LanguageService);

  readonly hoy = isoLocal(new Date());
  readonly lunes = signal(isoLocal(lunesDe(new Date())));
  readonly dias = computed(() => diasDeSemana(deIso(this.lunes())));
  readonly planilla = signal<Planilla | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly ocupadas = signal<Set<string>>(new Set());

  readonly cultivos = signal<CultivoDisponible[]>([]);
  readonly actividades = signal<Labor[]>([]);
  readonly cultivoId = signal<number | null>(null);
  readonly elegidas = signal<Set<number>>(new Set());
  readonly pidiendo = signal<PidiendoKilos | null>(null);
  /** En el celular la cuadrícula se desplaza de lado: se abre mostrando el día de hoy */
  private readonly rejilla = viewChild<ElementRef<HTMLElement>>('rejilla');

  readonly listo = computed(() => this.cultivoId() != null && this.elegidas().size > 0);
  readonly indice = computed(() => indexar(this.planilla()?.jornales ?? []));
  readonly totalSemana = computed(() => (this.planilla()?.jornales ?? []).reduce((s, j) => s + (j.valor ?? 0), 0));
  readonly esEstaSemana = computed(() => this.lunes() === isoLocal(lunesDe(new Date())));

  ngOnInit(): void {
    forkJoin({ cultivos: this.jornales.cultivosDisponibles(), labores: this.labores.listar() }).subscribe({
      next: ({ cultivos, labores }) => {
        this.cultivos.set(cultivos);
        const activas = labores.filter((l) => l.activa !== false);
        this.actividades.set(activas);
        const u = this.ultimo.leer<UltimaPlanilla>('planilla') ?? this.ultimo.leer<UltimaPlanilla>('jornal');
        const cultivo = cultivos.find((c) => c.id === u?.cultivoId) ?? (cultivos.length === 1 ? cultivos[0] : undefined);
        if (cultivo) this.cultivoId.set(cultivo.id);
        const ids = (u?.actividadIds ?? []).filter((id) => activas.some((a) => a.id === id));
        this.elegidas.set(new Set(ids.length ? ids : activas.length === 1 ? [activas[0].id!] : []));
      },
      error: () => this.error.set('workers.sheet.errors.load'),
    });
    this.cargar();
  }

  cargar(): void {
    const dias = this.dias();
    this.cargando.set(true);
    this.jornales.planilla(dias[0], dias[6]).subscribe({
      next: (p) => { this.planilla.set(p); this.cargando.set(false); this.error.set(null); setTimeout(() => this.mostrarHoy()); },
      error: () => { this.cargando.set(false); this.error.set('workers.sheet.errors.load'); },
    });
  }

  private mostrarHoy(): void {
    const caja = this.rejilla()?.nativeElement;
    const hoy = caja?.querySelector<HTMLElement>('th.dia.hoy');
    if (!caja || !hoy || caja.scrollWidth <= caja.clientWidth) return;
    const fija = caja.querySelector<HTMLElement>('th.quien')?.offsetWidth ?? 0;
    caja.scrollLeft = Math.max(0, hoy.offsetLeft - fija - hoy.offsetWidth * 2);
  }

  semana(delta: number): void {
    this.lunes.set(sumarDias(this.lunes(), 7 * delta));
    this.cargar();
  }

  estaSemana(): void {
    this.lunes.set(isoLocal(lunesDe(new Date())));
    this.cargar();
  }

  elegirCultivo(id: number | null): void {
    this.cultivoId.set(id);
    this.recordar();
  }

  alternarLabor(id: number | undefined): void {
    if (id == null) return;
    const s = new Set(this.elegidas());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.elegidas.set(s);
    this.recordar();
  }

  private recordar(): void {
    this.ultimo.guardar<UltimaPlanilla>('planilla', { cultivoId: this.cultivoId() ?? undefined, actividadIds: [...this.elegidas()] });
  }

  casilla(t: FilaPlanilla, fecha: string): CasillaPlanilla[] {
    return this.indice().get(clave(t.id, fecha)) ?? [];
  }

  total(t: FilaPlanilla) {
    return totalFila(t, this.planilla()?.jornales ?? []);
  }

  cuantosDia(fecha: string): number {
    return totalDia(fecha, this.planilla()?.jornales ?? []);
  }

  ocupada(t: FilaPlanilla, fecha: string): boolean {
    return this.ocupadas().has(clave(t.id, fecha));
  }

  futuro(fecha: string): boolean {
    return fecha > this.hoy;
  }

  /** "lun 16" */
  nombreDia(fecha: string): { corto: string; num: string } {
    const d = deIso(fecha);
    const lang = this.idioma.current();
    return {
      corto: d.toLocaleDateString(localeDe(lang), { weekday: 'short' }).replace('.', ''),
      num: String(d.getDate()),
    };
  }

  /** Tocar una casilla: vacía anota, llena quita */
  tocar(t: FilaPlanilla, fecha: string): void {
    if (this.futuro(fecha) || this.ocupada(t, fecha)) return;
    const hay = this.casilla(t, fecha);
    if (hay.length) { this.quitar(t, fecha, hay); return; }
    if (!t.activo) return;
    if (!this.listo()) { this.error.set('workers.sheet.chooseFirst'); return; }
    if (t.modalidadPago === 'KILO') { this.pidiendo.set({ trabajador: t, fecha, kilos: null }); return; }
    this.anotar([{ trabajadorId: t.id, fecha }]);
  }

  confirmarKilos(): void {
    const p = this.pidiendo();
    if (!p || !p.kilos || p.kilos <= 0) return;
    this.pidiendo.set(null);
    this.anotar([{ trabajadorId: p.trabajador.id, fecha: p.fecha, kilos: p.kilos }]);
  }

  /** Cabeza de un día: anota a todos los activos que se pagan por día y no tienen jornal ese día */
  todosElDia(fecha: string): void {
    if (this.futuro(fecha)) return;
    if (!this.listo()) { this.error.set('workers.sheet.chooseFirst'); return; }
    const faltan = (this.planilla()?.trabajadores ?? [])
      .filter((t) => t.activo && t.modalidadPago !== 'KILO' && !this.casilla(t, fecha).length);
    if (!faltan.length) return;
    this.anotar(faltan.map((t) => ({ trabajadorId: t.id, fecha })));
  }

  private anotar(entradas: { trabajadorId: number; fecha: string; kilos?: number | null }[], silencioso = false): void {
    const cultivoId = this.cultivoId();
    if (cultivoId == null) return;
    this.marcar(entradas.map((e) => clave(e.trabajadorId, e.fecha)), true);
    this.error.set(null);
    this.jornales.registrarVarios({ cultivoId, actividadIds: [...this.elegidas()], entradas }).subscribe({
      next: (creados) => {
        this.marcar(entradas.map((e) => clave(e.trabajadorId, e.fecha)), false);
        const p = this.planilla();
        if (p) {
          const nuevas: CasillaPlanilla[] = creados.map((j) => ({
            id: j.id!, trabajadorId: j.trabajador!.id!, fecha: String(j.fecha), cultivoId: j.cultivoId!,
            nombreCultivo: j.nombreCultivo ?? '', valor: j.valorJornal ?? 0, kilos: j.kilos ?? null,
            liquidado: !!j.liquidado, enNomina: false,
          }));
          this.planilla.set({ ...p, jornales: [...p.jornales, ...nuevas] });
        }
        if (!silencioso && creados.length > 1) this.avisos.exito('workers.sheet.added', { count: creados.length });
      },
      error: (e) => {
        this.marcar(entradas.map((x) => clave(x.trabajadorId, x.fecha)), false);
        this.error.set(e?.error?.message || 'workers.sheet.errors.save');
      },
    });
  }

  private quitar(t: FilaPlanilla, fecha: string, hay: CasillaPlanilla[]): void {
    const j = porQuitar(hay, this.cultivoId());
    if (!j) { this.error.set('workers.sheet.inPayroll'); return; }
    const k = clave(t.id, fecha);
    this.marcar([k], true);
    this.jornales.eliminar(j.id).subscribe({
      next: () => {
        this.marcar([k], false);
        const p = this.planilla();
        if (p) this.planilla.set({ ...p, jornales: p.jornales.filter((x) => x.id !== j.id) });
        // Deshacer: se vuelve a anotar con el mismo cultivo y las labores de ahora
        const antes = this.cultivoId();
        this.avisos.conDeshacer('workers.sheet.removed', { name: t.nombreCompleto }, () => {
          this.cultivoId.set(j.cultivoId);
          this.anotar([{ trabajadorId: t.id, fecha, kilos: j.kilos }], true);
          this.cultivoId.set(antes);
        });
      },
      error: (e) => {
        this.marcar([k], false);
        this.error.set(e?.error?.message || 'workers.sheet.errors.remove');
      },
    });
  }

  private marcar(claves: string[], ocupada: boolean): void {
    const s = new Set(this.ocupadas());
    claves.forEach((k) => (ocupada ? s.add(k) : s.delete(k)));
    this.ocupadas.set(s);
  }

  etiquetaCasilla(t: FilaPlanilla, fecha: string): string {
    const hay = this.casilla(t, fecha);
    const d = this.nombreDia(fecha);
    const quien = `${t.nombreCompleto}, ${d.corto} ${d.num}`;
    return hay.length
      ? this.translate.instant('workers.sheet.cellFilled', { who: quien })
      : this.translate.instant('workers.sheet.cellEmpty', { who: quien });
  }
}
