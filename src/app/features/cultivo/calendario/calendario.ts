import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin, of, catchError } from 'rxjs';
import { CultivoService } from '../../../core/services/cultivo.service';
import { FincaActivaService } from '../../../core/services/finca-activa.service';
import { LanguageService } from '../../../core/services/language.service';
import { formatoNumero, localeDe } from '../../../shared/formato';
import { EventoCalendario, Siembra, nombreCultivo } from '../../../core/models/cultivo.model';
import {
  ICONO_EVENTO, TONO_EVENTO, desdeIso, diasDelMes, diasHasta, esPorVenir, iso, ordenAgenda, textoCorto, textoEvento,
} from './eventos';

interface Dia { fecha: string; delMes: boolean; eventos: EventoCalendario[] }

/** Calendario de la finca activa: lo hecho, lo programado y lo estimado, por mes */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './calendario.html',
  styleUrls: ['../cultivo-ui.css', '../cultivo-bloques.css', './calendario.css', './calendario-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioComponent {
  private cultivo = inject(CultivoService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly fincaActiva = inject(FincaActivaService);

  readonly icono = ICONO_EVENTO;
  readonly tono = TONO_EVENTO;
  readonly hoy = iso(new Date());

  readonly anio = signal(new Date().getFullYear());
  readonly mes = signal(new Date().getMonth());
  readonly seleccionado = signal(this.hoy);
  /** null = todos los lotes */
  readonly lote = signal<number | null>(null);
  readonly verHechos = signal(true);

  readonly eventosMes = signal<EventoCalendario[] | null>(null);
  readonly proximos = signal<EventoCalendario[] | null>(null);
  readonly error = signal(false);

  // programar actividad
  readonly eligiendo = signal(false);
  readonly siembrasActivas = signal<{ siembra: Siembra; lote: string }[] | null>(null);

  readonly dias = computed<Dia[]>(() => {
    const ev = this.filtrar(this.eventosMes() ?? []);
    const porDia = new Map<string, EventoCalendario[]>();
    ev.forEach((e) => porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]));
    return diasDelMes(this.anio(), this.mes()).map((d) => ({ ...d, eventos: (porDia.get(d.fecha) ?? []).sort(ordenAgenda) }));
  });
  readonly delDia = computed(() => this.dias().find((d) => d.fecha === this.seleccionado())?.eventos ?? null);
  readonly agenda = computed(() => this.filtrar(this.proximos() ?? []).filter(esPorVenir).sort(ordenAgenda));
  readonly atrasados = computed(() => this.agenda().filter((e) => e.estado === 'ATRASADO').length);
  readonly titulo = computed(() =>
    new Intl.DateTimeFormat(localeDe(this.lang.current()), { month: 'long', year: 'numeric' }).format(new Date(this.anio(), this.mes(), 1)));
  readonly semana = computed(() => {
    const f = new Intl.DateTimeFormat(localeDe(this.lang.current()), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 10, 2 + i))); // 2 nov 2026 es lunes
  });

  constructor() {
    const lote = Number(this.route.snapshot.queryParamMap?.get('lote'));
    if (lote) this.lote.set(lote);

    // Eventos del mes visible
    effect(() => {
      const finca = this.fincaActiva.idActiva();
      const dias = diasDelMes(this.anio(), this.mes());
      if (!finca) { this.eventosMes.set([]); return; }
      this.eventosMes.set(null);
      this.cultivo.calendarioFinca(finca, dias[0].fecha, dias[dias.length - 1].fecha).subscribe({
        next: (ev) => { this.eventosMes.set(ev); this.error.set(false); },
        error: () => { this.eventosMes.set([]); this.error.set(true); },
      });
    });
    // Próximos 14 días (aunque estén en otro mes)
    effect(() => {
      const finca = this.fincaActiva.idActiva();
      if (!finca) { this.proximos.set([]); return; }
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + 14);
      this.cultivo.calendarioFinca(finca, this.hoy, iso(hasta)).subscribe({
        next: (ev) => this.proximos.set(ev),
        error: () => this.proximos.set([]),
      });
    });
  }

  private filtrar(ev: EventoCalendario[]): EventoCalendario[] {
    const lote = this.lote();
    return ev.filter((e) => (lote == null || e.loteId === lote) && (this.verHechos() || esPorVenir(e)));
  }

  // ── navegación ──────────────────────────────────────────────────────

  mover(delta: number): void {
    const d = new Date(this.anio(), this.mes() + delta, 1);
    this.anio.set(d.getFullYear());
    this.mes.set(d.getMonth());
  }

  irAHoy(): void {
    const d = new Date();
    this.anio.set(d.getFullYear());
    this.mes.set(d.getMonth());
    this.seleccionado.set(this.hoy);
  }

  elegirLote(v: string): void {
    this.lote.set(v ? Number(v) : null);
    this.router.navigate([], { queryParams: { lote: v || null }, replaceUrl: true });
  }

  abrir(e: EventoCalendario): void {
    const ruta = e.refId && e.tipo === 'ACTIVIDAD' && e.estado === 'PENDIENTE'
      ? ['/cultivo/siembra', e.siembraId, 'actividad', e.refId]
      : ['/cultivo/siembra', e.siembraId];
    this.router.navigate(ruta);
  }

  // ── programar actividad ────────────────────────────────────────────

  programar(): void {
    this.eligiendo.update((v) => !v);
    if (this.siembrasActivas() !== null) return;
    const lotes = this.fincaActiva.lotes().filter((l) => l.estado === 'EN_CULTIVO');
    if (!lotes.length) { this.siembrasActivas.set([]); return; }
    forkJoin(lotes.map((l) => this.cultivo.buscarSiembraPorLote(l.id!).pipe(catchError(() => of(null)))))
      .subscribe((ss) => this.siembrasActivas.set(
        ss.map((s, i) => (s ? { siembra: s, lote: lotes[i].nombre } : null)).filter((x): x is { siembra: Siembra; lote: string } => !!x)));
  }

  programarEn(s: Siembra): void {
    const fecha = this.seleccionado() >= this.hoy ? this.seleccionado() : this.hoy;
    this.router.navigate(['/cultivo/siembra', s.id, 'actividad'], { queryParams: { fecha } });
  }

  // ── formato ────────────────────────────────────────────────────────

  readonly nombreCultivo = nombreCultivo;

  texto(e: EventoCalendario) {
    return textoEvento(e, this.translate, (v, d = 0) => formatoNumero(v, this.lang.current(), d));
  }

  corto(e: EventoCalendario): string {
    return textoCorto(e, this.translate, (v, d = 0) => formatoNumero(v, this.lang.current(), d));
  }

  numDia(fecha: string): number {
    return Number(fecha.slice(8));
  }

  fechaLarga(fecha: string): string {
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), { weekday: 'long', day: 'numeric', month: 'long' }).format(desdeIso(fecha));
  }

  cuando(e: EventoCalendario): string {
    if (e.estado === 'ATRASADO') return this.translate.instant('temporadas.cal.overdue');
    const d = diasHasta(e.fecha, this.hoy);
    if (d === 0) return this.translate.instant('temporadas.cal.today');
    if (d === 1) return this.translate.instant('temporadas.cal.tomorrow');
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), { weekday: 'short', day: 'numeric' }).format(desdeIso(e.fecha));
  }
}
