import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, forkJoin, of, catchError, map, switchMap } from 'rxjs';
import { CultivoService } from '../../../core/services/crop.service';
import { FincaActivaService } from '../../../core/services/active-farm.service';
import { LanguageService } from '../../../core/services/language.service';
import { formatoNumero, localeDe } from '../../../shared/format';
import { EventoCalendario, Lote, Siembra, nombreCultivo } from '../../../core/models/crop.model';
import {
  ICONO_EVENTO,
  TONO_EVENTO,
  desdeIso,
  diasDelMes,
  diasHasta,
  esPorVenir,
  iso,
  ordenAgenda,
  textoCorto,
  textoEvento,
} from './events';

interface Dia {
  fecha: string;
  delMes: boolean;
  eventos: EventoCalendario[];
}

/** Calendario de la finca activa (o de todas juntas): lo hecho, lo programado y lo estimado, por mes */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './calendar.html',
  styleUrls: ['../crop-ui.css', '../crop-blocks.css', './calendar.css', './calendar-panel.css'],
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
  /** Fincas que se muestran: la activa, o todas si se eligió "Todas las fincas" */
  readonly fincasVisibles = computed<number[]>(
    () => {
      const activa = this.fincaActiva.idActiva();
      if (activa != null) return [activa];
      return this.fincaActiva
        .fincas()
        .map((f) => f.id)
        .filter((id): id is number => id != null);
    },
    { equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]) },
  );

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
    return diasDelMes(this.anio(), this.mes()).map((d) => ({
      ...d,
      eventos: (porDia.get(d.fecha) ?? []).sort(ordenAgenda),
    }));
  });
  readonly delDia = computed(
    () => this.dias().find((d) => d.fecha === this.seleccionado())?.eventos ?? null,
  );
  readonly agenda = computed(() =>
    this.filtrar(this.proximos() ?? [])
      .filter(esPorVenir)
      .sort(ordenAgenda),
  );
  readonly atrasados = computed(() => this.agenda().filter((e) => e.estado === 'ATRASADO').length);
  readonly titulo = computed(() =>
    new Intl.DateTimeFormat(localeDe(this.lang.current()), {
      month: 'long',
      year: 'numeric',
    }).format(new Date(this.anio(), this.mes(), 1)),
  );
  readonly semana = computed(() => {
    const f = new Intl.DateTimeFormat(localeDe(this.lang.current()), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 10, 2 + i))); // 2 nov 2026 es lunes
  });

  constructor() {
    const lote = Number(this.route.snapshot.queryParamMap?.get('lote'));
    if (lote) this.lote.set(lote);

    // Eventos del mes visible
    effect(() => {
      const fincas = this.fincasVisibles();
      const dias = diasDelMes(this.anio(), this.mes());
      this.siembrasActivas.set(null); // si cambia la finca, "Programar actividad" vuelve a buscar sus lotes
      if (!fincas.length) {
        this.eventosMes.set([]);
        return;
      }
      this.eventosMes.set(null);
      this.eventosDe(fincas, dias[0].fecha, dias[dias.length - 1].fecha).subscribe({
        next: (ev) => {
          this.eventosMes.set(ev);
          this.error.set(false);
        },
        error: () => {
          this.eventosMes.set([]);
          this.error.set(true);
        },
      });
    });
    // Próximos 14 días (aunque estén en otro mes)
    effect(() => {
      const fincas = this.fincasVisibles();
      if (!fincas.length) {
        this.proximos.set([]);
        return;
      }
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + 14);
      this.eventosDe(fincas, this.hoy, iso(hasta)).subscribe({
        next: (ev) => this.proximos.set(ev),
        error: () => this.proximos.set([]),
      });
    });
  }

  /** Une los calendarios de varias fincas en una sola lista */
  private eventosDe(
    fincas: number[],
    desde: string,
    hasta: string,
  ): Observable<EventoCalendario[]> {
    if (fincas.length === 1) return this.cultivo.calendarioFinca(fincas[0], desde, hasta);
    return forkJoin(fincas.map((f) => this.cultivo.calendarioFinca(f, desde, hasta))).pipe(
      map((ev) => ev.flat()),
    );
  }

  private filtrar(ev: EventoCalendario[]): EventoCalendario[] {
    const lote = this.lote();
    return ev.filter(
      (e) => (lote == null || e.loteId === lote) && (this.verHechos() || esPorVenir(e)),
    );
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

  /** Con "Todas las fincas" el filtro elige finca: es la misma del menú lateral */
  elegirFinca(v: string): void {
    this.lote.set(null);
    this.siembrasActivas.set(null);
    this.fincaActiva.elegir(v ? Number(v) : null);
  }

  elegirLote(v: string): void {
    this.lote.set(v ? Number(v) : null);
    this.router.navigate([], { queryParams: { lote: v || null }, replaceUrl: true });
  }

  abrir(e: EventoCalendario): void {
    const ruta =
      e.refId && e.tipo === 'ACTIVIDAD' && e.estado === 'PENDIENTE'
        ? ['/crops/planting', e.siembraId, 'activity', e.refId]
        : ['/crops/planting', e.siembraId];
    this.router.navigate(ruta);
  }

  // ── programar actividad ────────────────────────────────────────────

  programar(): void {
    this.eligiendo.update((v) => !v);
    if (this.siembrasActivas() !== null) return;
    this.lotesEnCultivo()
      .pipe(
        switchMap((lotes) =>
          lotes.length
            ? forkJoin(
                lotes.map((l) =>
                  this.cultivo.buscarSiembraPorLote(l.id!).pipe(
                    map((s) => (s ? { siembra: s, lote: l.nombre } : null)),
                    catchError(() => of(null)),
                  ),
                ),
              )
            : of([]),
        ),
      )
      .subscribe((ss) =>
        this.siembrasActivas.set(ss.filter((x): x is { siembra: Siembra; lote: string } => !!x)),
      );
  }

  /** Lotes sembrados de la finca activa, o de todas las fincas */
  private lotesEnCultivo(): Observable<Lote[]> {
    const enCultivo = (l: Lote[]) => l.filter((x) => x.estado === 'EN_CULTIVO');
    if (this.fincaActiva.idActiva() != null) return of(enCultivo(this.fincaActiva.lotes()));
    const fincas = this.fincasVisibles();
    if (!fincas.length) return of([]);
    return forkJoin(
      fincas.map((f) =>
        this.cultivo.listarLotesPorFinca(f).pipe(catchError(() => of([] as Lote[]))),
      ),
    ).pipe(map((l) => enCultivo(l.flat())));
  }

  programarEn(s: Siembra): void {
    const fecha = this.seleccionado() >= this.hoy ? this.seleccionado() : this.hoy;
    this.router.navigate(['/crops/planting', s.id, 'activity'], { queryParams: { fecha } });
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
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(desdeIso(fecha));
  }

  cuando(e: EventoCalendario): string {
    if (e.estado === 'ATRASADO') return this.translate.instant('temporadas.cal.overdue');
    const d = diasHasta(e.fecha, this.hoy);
    if (d === 0) return this.translate.instant('temporadas.cal.today');
    if (d === 1) return this.translate.instant('temporadas.cal.tomorrow');
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), {
      weekday: 'short',
      day: 'numeric',
    }).format(desdeIso(e.fecha));
  }
}
