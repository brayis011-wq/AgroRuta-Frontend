import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { CultivoService } from '../../core/services/cultivo.service';
import { LanguageService } from '../../core/services/language.service';
import { FincaActivaService } from '../../core/services/finca-activa.service';
import { JornalService, NominaService, PagoService, TrabajadorService } from '../../core/services/worker.service';
import { Jornal, Nomina, Pago, Trabajador } from '../../core/models/worker.model';
import { EventoCalendario, Finca, Lote, Siembra } from '../../core/models/cultivo.model';
import { ICONO_EVENTO, TONO_EVENTO, diasHasta, esPorVenir, ordenAgenda, textoEvento } from '../cultivo/calendario/eventos';
import { WeatherWidgetComponent } from '../weather/weather-widget/weather-widget.component';
import { formatoPesos, formatoNumero } from '../../shared/formato';
import { municipio } from '../../shared/clima';
import { ETAPAS_AVANCE, ResumenInicio, calcularResumen, diasDesde, inicioMesAnterior, pasoEtapa, saludoSegunHora, serieJornales } from './resumen-inicio';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type LoteConFinca = Lote & { fincaNombre: string };

/** Siembra en curso con su lote, para la tarjeta "Cultivos en curso" */
export interface CultivoEnCurso {
  siembra: Siembra;
  lote: LoteConFinca;
  dias: number;
  paso: number;
}

export interface Pendiente {
  clave: string;
  n: number;
  monto?: number;
  icono: string;
  tono: 'ambar' | 'azul' | 'verde' | 'gris';
  ruta: string;
  accion: string;
}

/** Inicio del agricultor: qué hay que hacer hoy y cómo va el mes */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe, RouterLink, NgTemplateOutlet, WeatherWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css', './dashboard-pendientes.css', './dashboard-cuerpo.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cultivo = inject(CultivoService);
  private readonly nominas = inject(NominaService);
  private readonly pagos = inject(PagoService);
  private readonly trabajadores = inject(TrabajadorService);
  private readonly jornales = inject(JornalService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  readonly lang = inject(LanguageService);
  readonly fincaActiva = inject(FincaActivaService);

  readonly etapas = ETAPAS_AVANCE;
  readonly iconoEvento = ICONO_EVENTO;
  readonly tonoEvento = TONO_EVENTO;

  readonly usuario = this.auth.getUsuario();
  readonly hoy = new Date();
  readonly saludo = saludoSegunHora(this.hoy);
  readonly cargando = signal(true);
  readonly resumen = signal<ResumenInicio | null>(null);
  /** Siembras en curso (null mientras carga) */
  readonly cultivos = signal<CultivoEnCurso[] | null>(null);
  /** Lo que viene en el calendario de las próximas semanas (null mientras carga) */
  readonly agenda = signal<EventoCalendario[] | null>(null);
  private readonly jornalesCargados = signal<Jornal[] | null>(null);

  /** Jornales de los últimos 30 días para la gráfica */
  readonly serie = computed(() => {
    const j = this.jornalesCargados();
    return j ? serieJornales(j, this.hoy, 30) : null;
  });
  readonly maxSerie = computed(() => Math.max(1, ...(this.serie() ?? []).map((d) => d.n)));
  readonly totalSerie = computed(() => (this.serie() ?? []).reduce((s, d) => ({ n: s.n + d.n, valor: s.valor + d.valor }), { n: 0, valor: 0 }));

  /** Lo que requiere atención, en orden de urgencia; solo lo que tiene algo */
  readonly pendientes = computed<Pendiente[]>(() => {
    const r = this.resumen();
    if (!r) return [];
    const lista: Pendiente[] = [
      { clave: 'toApprove', n: r.porAprobar.n, monto: r.porAprobar.total, icono: 'ti-clock-hour-4', tono: 'ambar', ruta: '/worker/nominas', accion: 'review' },
      { clave: 'toPay', n: r.sinPagar.n, monto: r.sinPagar.total, icono: 'ti-cash', tono: 'azul', ruta: '/worker/nominas', accion: 'pay' },
      { clave: 'portal', n: r.solicitudesPortal, icono: 'ti-user-check', tono: 'verde', ruta: '/worker', accion: 'approve' },
      { clave: 'noWage', n: r.sinJornalHoy, icono: 'ti-calendar-plus', tono: 'gris', ruta: '/worker/jornales/nuevo', accion: 'register' },
      { clave: 'freeLots', n: r.lotesDisponibles, icono: 'ti-seeding', tono: 'verde', ruta: '/cultivo', accion: 'plant' },
    ];
    return lista.filter((p) => p.n > 0);
  });

  /** Coordenadas para el widget de clima (finca elegida en el menú) */
  readonly climaFinca = computed(() => this.fincaActiva.paraClima());
  readonly climaLugar = computed(() => municipio(this.climaFinca()) || null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const id = this.usuario?.id;
    if (id == null) { this.cargando.set(false); return; }
    const desde = iso(inicioMesAnterior(this.hoy));
    const hasta = iso(this.hoy);
    // Si una consulta falla, el Inicio igual se muestra con lo demás
    const vacio = <T>(o: Observable<T[]>): Observable<T[]> => o.pipe(catchError(() => of([] as T[])));

    const trabajadores$ = vacio<Trabajador>(this.trabajadores.listarTodos());
    const jornales$ = trabajadores$.pipe(
      switchMap((ts) => {
        const activos = ts.filter((t) => t.estado === 'ACTIVO' && t.id != null);
        return activos.length
          ? forkJoin(activos.map((t) => vacio<Jornal>(this.jornales.porTrabajador(t.id!, desde, hasta))))
              .pipe(map((listas) => listas.flat()))
          : of([] as Jornal[]);
      }),
    );
    const fincas$ = vacio<Finca>(this.cultivo.listarFincasPorAgricultor(id)).pipe(shareReplay(1));
    const lotes$ = fincas$.pipe(
      switchMap((fs) => fs.length
        ? forkJoin(fs.map((f) => vacio<Lote>(this.cultivo.listarLotesPorFinca(f.id!))
            .pipe(map((ls) => ls.map((l): LoteConFinca => ({ ...l, fincaNombre: f.nombre })))))).pipe(map((l) => l.flat()))
        : of([] as LoteConFinca[])),
      shareReplay(1),
    );

    // Siembras en curso: una consulta por lote sembrado
    lotes$.pipe(
      switchMap((ls) => {
        const sembrados = ls.filter((l) => l.estado === 'EN_CULTIVO' && l.id != null);
        return sembrados.length
          ? forkJoin(sembrados.map((l) => this.cultivo.buscarSiembraPorLote(l.id!).pipe(
              map((s): CultivoEnCurso | null => s ? { siembra: s, lote: l, dias: diasDesde(s.fechaSiembra, this.hoy), paso: pasoEtapa(s.estadoCultivo) } : null),
              catchError(() => of(null)))))
          : of([] as (CultivoEnCurso | null)[]);
      }),
    ).subscribe((r) => this.cultivos.set(
      r.filter((c): c is CultivoEnCurso => c !== null).sort((a, b) => b.paso - a.paso || b.dias - a.dias)));

    // Próximas tres semanas del calendario (de la finca elegida, o de todas)
    const hace7 = new Date(this.hoy); hace7.setDate(hace7.getDate() - 7);
    const hasta3 = new Date(this.hoy); hasta3.setDate(hasta3.getDate() + 21);
    fincas$.pipe(
      switchMap((fs) => {
        const activa = this.fincaActiva.idActiva?.() ?? null;
        const ids = activa != null && fs.some((f) => f.id === activa) ? [activa] : fs.map((f) => f.id!).filter((x) => x != null);
        return ids.length
          ? forkJoin(ids.map((fid) => vacio<EventoCalendario>(this.cultivo.calendarioFinca(fid, iso(hace7), iso(hasta3))))).pipe(map((l) => l.flat()))
          : of([] as EventoCalendario[]);
      }),
    ).subscribe((ev) => this.agenda.set(ev.filter(esPorVenir).sort(ordenAgenda).slice(0, 6)));

    forkJoin({
      nominas: vacio<Nomina>(this.nominas.listarTodas()),
      pagos: vacio<Pago>(this.pagos.listarTodos()),
      trabajadores: trabajadores$,
      jornales: jornales$,
      lotes: lotes$,
    }).subscribe((d) => {
      this.resumen.set(calcularResumen(d, this.hoy));
      this.jornalesCargados.set(d.jornales);
      this.cargando.set(false);
    });
  }

  nombreCorto(): string {
    return (this.usuario?.nombre ?? '').trim().split(/\s+/)[0] ?? '';
  }

  fechaHoy(): string {
    return new Intl.DateTimeFormat(this.lang.current(), { weekday: 'long', day: 'numeric', month: 'long' }).format(this.hoy);
  }

  pesos(v: number): string {
    return formatoPesos(v, this.lang.current());
  }

  numero(v: number): string {
    return formatoNumero(v, this.lang.current());
  }

  /** Título y detalle traducidos de un evento del calendario */
  textoEvento(e: EventoCalendario): { titulo: string; sub: string } {
    return textoEvento(e, this.translate, (v, d = 0) => formatoNumero(v, this.lang.current(), d));
  }

  /** "Hoy", "Mañana", "En 3 días" o "Atrasado" */
  cuando(e: EventoCalendario): string {
    if (e.estado === 'ATRASADO') return this.translate.instant('dashboard.agenda.late');
    const d = diasHasta(e.fecha, iso(this.hoy));
    if (d <= 0) return this.translate.instant('dashboard.agenda.today');
    if (d === 1) return this.translate.instant('dashboard.agenda.tomorrow');
    return this.translate.instant('dashboard.agenda.inDays', { days: d });
  }

  fechaCorta(f: Date): string {
    return new Intl.DateTimeFormat(this.lang.current(), { weekday: 'short', day: 'numeric', month: 'short' }).format(f);
  }

  irA(ruta: string): void {
    this.router.navigate([ruta]);
  }
}
