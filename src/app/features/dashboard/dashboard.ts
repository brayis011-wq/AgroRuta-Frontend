import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { CultivoService } from '../../core/services/cultivo.service';
import { LanguageService } from '../../core/services/language.service';
import { FincaActivaService } from '../../core/services/finca-activa.service';
import { JornalService, NominaService, PagoService, TrabajadorService } from '../../core/services/worker.service';
import { Jornal, Nomina, Pago, Trabajador } from '../../core/models/worker.model';
import { Lote } from '../../core/models/cultivo.model';
import { WeatherWidgetComponent } from '../weather/weather-widget/weather-widget.component';
import { formatoPesos, formatoNumero } from '../../shared/formato';
import { municipio } from '../../shared/clima';
import { ResumenInicio, calcularResumen, inicioMesAnterior, saludoSegunHora } from './resumen-inicio';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  styleUrls: ['./dashboard.css', './dashboard-pendientes.css'],
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
  readonly lang = inject(LanguageService);
  readonly fincaActiva = inject(FincaActivaService);

  readonly usuario = this.auth.getUsuario();
  readonly hoy = new Date();
  readonly saludo = saludoSegunHora(this.hoy);
  readonly cargando = signal(true);
  readonly resumen = signal<ResumenInicio | null>(null);

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
    const lotes$ = vacio<Lote>(this.cultivo.listarFincasPorAgricultor(id).pipe(
      switchMap((fs) => fs.length
        ? forkJoin(fs.map((f) => vacio<Lote>(this.cultivo.listarLotesPorFinca(f.id!)))).pipe(map((l) => l.flat()))
        : of([] as Lote[])),
    ));

    forkJoin({
      nominas: vacio<Nomina>(this.nominas.listarTodas()),
      pagos: vacio<Pago>(this.pagos.listarTodos()),
      trabajadores: trabajadores$,
      jornales: jornales$,
      lotes: lotes$,
    }).subscribe((d) => {
      this.resumen.set(calcularResumen(d, this.hoy));
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

  irA(ruta: string): void {
    this.router.navigate([ruta]);
  }
}
