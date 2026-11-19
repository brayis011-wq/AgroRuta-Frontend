import { AvisosService, DESHACER_MS } from '../../../../core/services/toast.service';
import { guardarEnUrl, leerDeUrl } from '../../../../shared/url-state';
import { AnteriorSiguienteComponent, Vecino } from '../../../../shared/prev-next/prev-next';
import { SiembraActiva, SiembrasActivasService, vecinos } from '../../../../core/services/active-plantings.service';
import { FincaActivaService } from '../../../../core/services/active-farm.service';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, Injector, inject } from '@angular/core';
import { Subscription, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MigasCultivoComponent } from '../../../../shared/breadcrumbs/crop-breadcrumbs';
import { AyudaComponent } from '../../../../shared/help-tip/help-tip';
import { CultivoService } from '../../../../core/services/crop.service';
import { LanguageService } from '../../../../core/services/language.service';
import {
  Siembra,
  Finca,
  ActividadCultivo,
  Fumigacion,
  Cosecha,
  nombreCultivo as nombreDeCultivo,
} from '../../../../core/models/crop.model';
import { CicloEtapasComponent } from '../stage-cycle/stage-cycle';
import { RendimientoSiembraComponent } from '../yield/yield';
import { AgendaSiembraComponent } from '../agenda/agenda';
import { DiagnosticoSiembraComponent } from '../diagnosis/diagnosis';
import { diasEntre, hoyIso } from '../stage-cycle/stage-cycle.logic';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { ResumenSiembra, siembraActiva } from '../../../../core/models/crop.model';
import { formatoFecha, formatoNumero } from '../../../../shared/format';
import { WeatherService } from '../../../../core/services/weather.service';
import { Weather } from '../../../../core/models/weather.model';
import { ConsejoClima, consejoFumigacion, municipio } from '../../../../shared/weather';

interface TimelineItem {
  id: number;
  fecha: string;
  tipo: 'actividad' | 'fumigacion' | 'cosecha';
  tituloKey?: string;      // clave de traducción (actividad)
  titulo?: string;         // texto directo (producto / kg)
  detalle?: string;        // descripción libre del usuario (actividad)
  dosis?: number;          // fumigación
  unidad?: string;
  area?: number;
  calidad?: string;        // cosecha
  enCarencia?: boolean;    // cosecha registrada dentro de la carencia de una fumigación
  carencia?: number | null;  // fumigación: días sin cosechar
  reentrada?: number | null; // fumigación: horas sin entrar
  extra?: string;
}

export type PestanaSiembra = 'resumen' | 'registros' | 'cosechas' | 'diagnostico';

export const PESTANAS_SIEMBRA: { id: PestanaSiembra; icono: string; clave: string }[] = [
  { id: 'resumen', icono: 'ti-layout-dashboard', clave: 'siembra.detail.tabs.summary' },
  { id: 'registros', icono: 'ti-history', clave: 'siembra.detail.tabs.records' },
  { id: 'cosechas', icono: 'ti-basket', clave: 'siembra.detail.tabs.harvests' },
  { id: 'diagnostico', icono: 'ti-stethoscope', clave: 'siembra.detail.tabs.diagnosis' },
];

@Component({
  selector: 'app-detalle-siembra',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CicloEtapasComponent, RendimientoSiembraComponent, AgendaSiembraComponent, DiagnosticoSiembraComponent, RouterLink, RouterOutlet, MigasCultivoComponent, AyudaComponent, AnteriorSiguienteComponent],
  templateUrl: './planting-detail.html',
  styleUrls: ['../../crop-ui.css', '../../crop-blocks.css', '../../crop-dialog.css', './planting-detail.css', './planting-detail-today.css'],
})
export class DetalleSiembraComponent implements OnInit, OnDestroy {
  /** \"Café · Castillo\" */
  readonly nombreCultivo = nombreDeCultivo;
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private confirm = inject(ConfirmService);
  private weather = inject(WeatherService);
  private avisos = inject(AvisosService);

  /** Clima actual del lote (o del municipio de la finca) */
  clima: Weather | null = null;
  consejo: ConsejoClima | null = null;
  nombreFinca: string | null = null;
  /** Rendimiento, cosechas por semana, carencia y reentrada (null mientras carga) */
  resumen: ResumenSiembra | null = null;
  /** Sube cuando algo cambia, para que la agenda y los costos se recarguen */
  version = 0;

  /** La temporada sigue abierta (se pueden registrar cosas) */
  get activa(): boolean {
    return siembraActiva(this.siembra);
  }

  /** Id de la ruta (se conoce antes de que llegue la siembra: las migas de pan lo usan) */
  siembraId: number | null = null;
  siembra: Siembra | null = null;
  actividades: ActividadCultivo[] = [];
  fumigaciones: Fumigacion[] = [];
  cosechas: Cosecha[] = [];
  totalKg = 0;
  cargando = true;
  error = '';              // clave de traducción
  mostrarConfirmacion = false;
  textoConfirmacion = '';
  eliminando = false;

  fincaLat: number | null = null;
  fincaLng: number | null = null;
  nombreLote: string | null = null;
  timelineCompleto: TimelineItem[] = [];
  filtroActivo: 'todo' | 'actividad' | 'fumigacion' | 'cosecha' = 'todo';

  /** Anterior y siguiente entre las siembras en curso de todas las fincas */
  vecinos: { anterior: Vecino | null; siguiente: Vecino | null; posicion: number; total: number } = { anterior: null, siguiente: null, posicion: 0, total: 0 };
  private readonly injector = inject(Injector);

  private cargarVecinos(id: number): void {
    let fincas: Finca[] = [];
    try { fincas = this.injector.get(FincaActivaService).fincas?.() ?? []; } catch { return; }
    if (!fincas.length) return;
    this.injector.get(SiembrasActivasService).listar(fincas).subscribe({
      next: (activas) => {
        if (this.siembraId !== id) return;
        const comoVecino = (a: SiembraActiva | null): Vecino | null =>
          a ? { texto: nombreDeCultivo(a.siembra) || a.lote.nombre, ruta: ['/crops/planting', a.siembra.id!] } : null;
        const v = vecinos(activas, (a) => a.siembra.id === id);
        this.vecinos = { anterior: comoVecino(v.anterior), siguiente: comoVecino(v.siguiente), posicion: v.posicion, total: v.posicion < 0 ? 0 : activas.length };
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /** Pestañas de la ficha: así la página no es una sola columna larguísima */
  readonly pestanas = PESTANAS_SIEMBRA;
  pestana: PestanaSiembra = 'resumen';

  elegirPestana(p: PestanaSiembra): void {
    this.pestana = p;
    // En la dirección: al volver atrás desde un registro se abre la misma pestaña
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: p === 'resumen' ? null : p }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  get timelineFiltrado(): TimelineItem[] {
    const visibles = this.ocultos.size ? this.timelineCompleto.filter((i) => !this.ocultos.has(i.tipo + '-' + i.id)) : this.timelineCompleto;
    if (this.filtroActivo === 'todo') return visibles;
    return visibles.filter(i => i.tipo === this.filtroActivo);
  }

  /** Palabra que el usuario debe escribir para confirmar (cambia con el idioma) */
  get palabraConfirmacion(): string {
    return this.translate.instant('cultivo.fincas.delete.confirmWord');
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  private rutaSub?: Subscription;

  ngOnInit(): void {
    const tab = this.route.snapshot?.queryParamMap?.get('tab') as PestanaSiembra | null;
    if (tab && PESTANAS_SIEMBRA.some((p) => p.id === tab)) this.pestana = tab;
    const filtro = leerDeUrl(this.route, 'filtro', ['actividad', 'fumigacion', 'cosecha']);
    if (filtro) this.filtroActivo = filtro as 'actividad' | 'fumigacion' | 'cosecha';
    // Se reutiliza al pasar de una siembra a otra: recargar con cada id
    const params$ = this.route.paramMap ?? of(this.route.snapshot.paramMap);
    this.rutaSub = params$.subscribe((p) => this.cargarSiembra(Number(p.get('id'))));
    // Al volver de un formulario del panel la ficha no se crea de nuevo: la pestaña sigue a la dirección
    this.route.queryParamMap?.subscribe((q) => {
      const t = q.get('tab') as PestanaSiembra | null;
      this.pestana = t && PESTANAS_SIEMBRA.some((p) => p.id === t) ? t : 'resumen';
      const nuevo = q.get('nuevo');
      if (nuevo) this.resaltarCuandoAparezca(nuevo);
      this.cdr.markForCheck();
    });
  }

  /** Registro recién guardado ('cosecha-12'): se lleva a la vista y se marca un momento */
  resaltar: string | null = null;
  private relojResaltar: ReturnType<typeof setTimeout> | null = null;

  private resaltarCuandoAparezca(clave: string, intentos = 0): void {
    const el = document.getElementById('reg-' + clave);
    // Los registros llegan del servidor después de volver del formulario: se espera un poco
    if (!el) {
      if (intentos < 20) setTimeout(() => this.resaltarCuandoAparezca(clave, intentos + 1), 150);
      return;
    }
    this.resaltar = clave;
    this.cdr.markForCheck();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (this.relojResaltar) clearTimeout(this.relojResaltar);
    this.relojResaltar = setTimeout(() => { this.resaltar = null; this.cdr.markForCheck(); }, 2600);
    // Se quita de la dirección para que recargar no vuelva a marcarlo
    guardarEnUrl(this.router, this.route, { nuevo: null });
  }

  // ── Panel de registro (actividad, fumigación o cosecha encima de la ficha) ──
  panelAbierto = false;

  alAbrirPanel(): void {
    this.panelAbierto = true;
    document.body.classList.add('con-panel');
  }

  /** El formulario se cerró (guardó, canceló o se volvió atrás): se recargan los registros y los totales */
  alCerrarPanel(): void {
    this.panelAbierto = false;
    document.body.classList.remove('con-panel');
    if (!this.siembra?.id) return;
    this.version++;
    this.cargarDatos(this.siembra.id);
    this.cargarResumen(this.siembra.id);
  }

  cerrarPanel(): void {
    if (!this.siembraId) return;
    this.router.navigate(['/crops/planting', this.siembraId], { queryParams: { tab: this.pestana === 'resumen' ? null : this.pestana } });
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    if (this.panelAbierto) this.cerrarPanel();
  }

  ngOnDestroy(): void {
    this.hacerBorradoPendiente();
    document.body.classList.remove('con-panel');
    this.rutaSub?.unsubscribe();
  }

  private cargarSiembra(id: number): void {
    this.siembraId = id;
    this.siembra = null;
    this.actividades = []; this.fumigaciones = []; this.cosechas = [];
    this.timelineCompleto = []; this.totalKg = 0;
    this.clima = null; this.consejo = null; this.resumen = null;
    this.nombreLote = null; this.nombreFinca = null;
    this.fincaLat = null; this.fincaLng = null;
    this.cargando = true; this.error = '';
    this.cultivoService.buscarSiembra(id).subscribe({
      next: (siembra) => {
        this.siembra = siembra;
        this.cargarVecinos(id);
        this.cargarDatos(id);
        this.cargarResumen(id);
        // Cargar coordenadas reales del lote/finca
        this.cultivoService.buscarLote(siembra.loteId).subscribe({
          next: (lote) => {
            this.nombreLote = lote.nombre;
            if (lote.centroideLat && lote.centroideLng) {
              this.fincaLat = lote.centroideLat;
              this.fincaLng = lote.centroideLng;
            }
            this.cultivoService.buscarFinca(lote.fincaId).subscribe({
              next: (finca) => {
                this.nombreFinca = finca.nombre;
                this.fincaLat ??= finca.centroideLat ?? null;
                this.fincaLng ??= finca.centroideLng ?? null;
                this.cargarClima(municipio(finca));
                this.cdr.detectChanges();
              },
              error: () => this.cargarClima(''),
            });
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.error = 'siembra.detail.errors.load';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarDatos(siembraId: number): void {
    let cargados = 0;
    const verificar = () => {
      cargados++;
      if (cargados === 3) {
        this.construirTimeline();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    };

    this.cultivoService.listarActividades(siembraId).subscribe({
      next: (a) => { this.actividades = a; verificar(); },
      error: () => verificar(),
    });
    this.cultivoService.listarFumigaciones(siembraId).subscribe({
      next: (f) => { this.fumigaciones = f; verificar(); },
      error: () => verificar(),
    });
    this.cultivoService.listarCosechas(siembraId).subscribe({
      next: (c) => { this.cosechas = c; verificar(); },
      error: () => verificar(),
    });
    this.cultivoService.totalKgCosechado(siembraId).subscribe({
      next: (t) => { this.totalKg = t || 0; this.cdr.detectChanges(); },
    });
  }

  private construirTimeline(): void {
    const items: TimelineItem[] = [];

    this.actividades.forEach(a => items.push({
      id: a.id!,
      fecha: a.fecha,
      tipo: 'actividad',
      tituloKey: 'enums.tipoActividad.' + a.tipo,
      detalle: a.descripcion,
    }));

    this.fumigaciones.forEach(f => items.push({
      id: f.id!,
      carencia: f.diasCarencia ?? null,
      reentrada: f.reentradaHoras ?? null,
      fecha: f.fecha,
      tipo: 'fumigacion',
      titulo: f.producto,
      dosis: f.dosis,
      unidad: f.unidadMedida,
      area: f.areaAplicada,
      extra: f.observaciones,
    }));

    this.cosechas.forEach(c => items.push({
      id: c.id!,
      fecha: c.fecha,
      tipo: 'cosecha',
      titulo: `${this.fmtNum(c.cantidadKg)} kg`,
      calidad: c.calidad,
      enCarencia: !!c.enCarencia,
      extra: c.observaciones,
    }));

    this.timelineCompleto = items.sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }

  // ===== Formato según idioma activo (Intl nativo) =====

  fmtNum(v: number): string {
    return new Intl.NumberFormat(this.lang.current(), { maximumFractionDigits: 2 }).format(v);
  }

  /** Las fechas "yyyy-MM-dd" se leen como fecha local (evita que se corra un día) */
  fmtFecha(v: string | undefined | null): string {
    if (!v) return '';
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);
    return new Intl.DateTimeFormat(this.lang.current(), {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(fecha);
  }

  getIcono(tipo: string): string {
    switch (tipo) {
      case 'actividad':  return '📋';
      case 'fumigacion': return '💨';
      case 'cosecha':    return '⚖️';
      default: return '•';
    }
  }

  setFiltro(filtro: 'todo' | 'actividad' | 'fumigacion' | 'cosecha'): void {
    this.filtroActivo = filtro;
    guardarEnUrl(this.router, this.route, { filtro: filtro === 'todo' ? null : filtro });
  }

  private cargarResumen(id: number): void {
    this.cultivoService.resumenSiembra(id).subscribe({
      next: (r) => { if (this.siembra?.id === id) { this.resumen = r; this.cdr.detectChanges(); } },
      error: () => { /* la página sigue sin el resumen */ },
    });
  }

  private cargarClima(lugar: string): void {
    const obs = this.fincaLat != null && this.fincaLng != null
      ? this.weather.getByCoordinates(this.fincaLat, this.fincaLng)
      : lugar ? this.weather.getByCity(lugar) : null;
    obs?.subscribe({
      next: (w) => {
        this.clima = w;
        this.consejo = consejoFumigacion(w);
        this.cdr.detectChanges();
      },
      error: () => { this.clima = null; },
    });
  }

  /** Días desde la última fumigación y qué tan urgente es la próxima */
  estadoFumigacion(): { nivel: 'verde' | 'ambar' | 'rojo'; clave: string; dias: number } {
    if (!this.fumigaciones.length) return { nivel: 'rojo', clave: 'siembra.detail.alert.noSprays', dias: 0 };
    const ultima = [...this.fumigaciones].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const dias = Math.floor((Date.now() - new Date(ultima.fecha + 'T00:00:00').getTime()) / 86_400_000);
    if (dias > 7) return { nivel: 'rojo', clave: 'siembra.detail.alert.overdue', dias };
    if (dias > 5) return { nivel: 'ambar', clave: 'siembra.detail.alert.overdue', dias };
    return { nivel: 'verde', clave: 'siembra.detail.alert.upToDate', dias };
  }

  icono(tipo: TimelineItem['tipo']): string {
    return { actividad: 'ti-clipboard-list', fumigacion: 'ti-spray', cosecha: 'ti-basket' }[tipo];
  }

  num(v: number | null | undefined, dec = 0): string {
    return formatoNumero(v, this.lang.current(), dec);
  }

  /** La etapa cambió o la temporada se cerró/reabrió */
  alCambiarSiembra(s: Siembra): void {
    this.siembra = s;
    this.version++;
    this.cdr.detectChanges();
  }

  /** "jueves 6 nov": para avisos de los próximos días */
  fmtDia(v: string | null | undefined): string {
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return new Intl.DateTimeFormat(this.lang.current() === 'en' ? 'en-US' : 'es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
      .format(new Date(y, m - 1, d));
  }

  fmtFechaLarga(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }

  editarSiembra(): void {
    this.router.navigate(['/crops/planting', this.siembra!.id, 'edit']);
  }

  editarRegistro(item: TimelineItem): void {
    const ruta = { actividad: 'activity', fumigacion: 'spraying', cosecha: 'harvest' }[item.tipo];
    this.router.navigate(['/crops/planting', this.siembra!.id, ruta, item.id]);
  }

  // ── Borrar un registro con "Deshacer" ──────────────────────────────
  // El registro desaparece al instante y se borra en el servidor a los pocos segundos, salvo que se toque
  // "Deshacer". Si se sale de la siembra antes, el borrado se hace en ese momento.
  private ocultos = new Set<string>();
  private borradoPendiente: { clave: string; ejecutar: () => void; reloj: ReturnType<typeof setTimeout> } | null = null;

  eliminarRegistro(item: TimelineItem): void {
    if (!this.siembra?.id) return;
    this.hacerBorradoPendiente(); // si había otro esperando, se hace ya
    const clave = item.tipo + '-' + item.id;
    const siembraId = this.siembra.id;
    this.ocultos.add(clave);
    const ejecutar = () => {
      if (this.borradoPendiente?.clave === clave) { clearTimeout(this.borradoPendiente.reloj); this.borradoPendiente = null; }
      const peticion = item.tipo === 'actividad'
        ? this.cultivoService.eliminarActividad(item.id)
        : item.tipo === 'fumigacion'
          ? this.cultivoService.eliminarFumigacion(item.id)
          : this.cultivoService.eliminarCosecha(item.id);
      peticion.subscribe({
        next: () => {
          if (this.siembra?.id !== siembraId) return;
          this.version++; this.cargarDatos(siembraId); this.cargarResumen(siembraId);
        },
        error: (e) => {
          this.ocultos.delete(clave);
          this.error = e?.error?.message || 'temporadas.registro.errors.delete';
          this.cdr.detectChanges();
        },
      });
    };
    this.borradoPendiente = { clave, ejecutar, reloj: setTimeout(ejecutar, DESHACER_MS) };
    const nombre = item.tituloKey ? this.translate.instant(item.tituloKey) : item.titulo;
    this.avisos.conDeshacer('temporadas.registro.deleted', { nombre }, () => {
      if (this.borradoPendiente?.clave !== clave) return;
      clearTimeout(this.borradoPendiente.reloj);
      this.borradoPendiente = null;
      this.ocultos.delete(clave);
      this.cdr.detectChanges();
    });
    this.cdr.detectChanges();
  }

  private hacerBorradoPendiente(): void {
    this.borradoPendiente?.ejecutar();
  }


  iniciarEliminacion(): void {
    this.mostrarConfirmacion = true;
    this.textoConfirmacion = '';
  }

  cancelarEliminacion(): void {
    this.mostrarConfirmacion = false;
    this.textoConfirmacion = '';
  }

  confirmarEliminacion(): void {
    if (this.textoConfirmacion !== this.palabraConfirmacion || !this.siembra) return;
    this.eliminando = true;
    this.cultivoService.eliminarSiembra(this.siembra.id!).subscribe({
      next: () => {
        this.router.navigate(['/crops/plot', this.siembra!.loteId]);
      },
      error: () => {
        this.error = 'siembra.detail.errors.delete';
        this.eliminando = false;
        this.mostrarConfirmacion = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Días en campo; si la temporada terminó, lo que duró */
  getDiasTranscurridos(): number {
    if (!this.siembra?.fechaSiembra) return 0;
    return diasEntre(this.siembra.fechaSiembra, this.siembra.fechaFin ?? hoyIso());
  }

  getUltimaActividad(): string {
    if (this.actividades.length === 0) return this.translate.instant('siembra.detail.cards.noActivities');
    const ultima = this.actividades[this.actividades.length - 1];
    const tipo = this.translate.instant('enums.tipoActividad.' + ultima.tipo);
    return `${tipo} - ${this.fmtFecha(ultima.fecha)}`;
  }

  getUltimaFumigacion(): string {
    if (this.fumigaciones.length === 0) return this.translate.instant('siembra.detail.cards.noSprays');
    const ultima = this.fumigaciones[this.fumigaciones.length - 1];
    return `${ultima.producto} - ${this.fmtFecha(ultima.fecha)}`;
  }

  getAlerta(): string {
    if (this.fumigaciones.length === 0) {
      return '🔴 ' + this.translate.instant('siembra.detail.alert.noSprays');
    }
    const ultima = new Date(this.fumigaciones[this.fumigaciones.length - 1].fecha);
    const dias = Math.floor((new Date().getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > 7) return '🔴 ' + this.translate.instant('siembra.detail.alert.overdue', { days: dias });
    if (dias > 5) return '🟡 ' + this.translate.instant('siembra.detail.alert.overdue', { days: dias });
    return '🟢 ' + this.translate.instant('siembra.detail.alert.upToDate');
  }

  registrarActividad(): void {
    this.router.navigate(['/crops/planting', this.siembra!.id, 'activity']);
  }

  registrarFumigacion(): void {
    this.router.navigate(['/crops/planting', this.siembra!.id, 'spraying']);
  }

  registrarCosecha(): void {
    this.router.navigate(['/crops/planting', this.siembra!.id, 'harvest']);
  }

}
