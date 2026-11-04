import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { LanguageService } from '../../../../core/services/language.service';
import {
  Siembra,
  ActividadCultivo,
  Fumigacion,
  Cosecha,
  nombreCultivo as nombreDeCultivo,
} from '../../../../core/models/cultivo.model';
import { WeatherWidgetComponent } from '../../../weather/weather-widget/weather-widget.component';
import { CicloEtapasComponent } from '../ciclo-etapas/ciclo-etapas';
import { diasEntre, hoyIso } from '../ciclo-etapas/ciclo-etapas.logic';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { siembraActiva } from '../../../../core/models/cultivo.model';
import { formatoFecha } from '../../../../shared/formato';

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
  extra?: string;
}

@Component({
  selector: 'app-detalle-siembra',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, WeatherWidgetComponent, CicloEtapasComponent],
  templateUrl: './detalle-siembra.html',
  styleUrls: ['./detalle-siembra.css', './detalle-siembra-registros.css'],
})
export class DetalleSiembraComponent implements OnInit {
  /** \"Café · Castillo\" */
  readonly nombreCultivo = nombreDeCultivo;
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private confirm = inject(ConfirmService);

  /** La temporada sigue abierta (se pueden registrar cosas) */
  get activa(): boolean {
    return siembraActiva(this.siembra);
  }

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

  get timelineFiltrado(): TimelineItem[] {
    if (this.filtroActivo === 'todo') return this.timelineCompleto;
    return this.timelineCompleto.filter(i => i.tipo === this.filtroActivo);
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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cultivoService.buscarSiembra(id).subscribe({
      next: (siembra) => {
        this.siembra = siembra;
        this.cargarDatos(id);
        // Cargar coordenadas reales del lote/finca
        this.cultivoService.buscarLote(siembra.loteId).subscribe({
          next: (lote) => {
            if (lote.centroideLat && lote.centroideLng) {
              this.fincaLat = lote.centroideLat;
              this.fincaLng = lote.centroideLng;
              this.cdr.detectChanges();
            }
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
  }

  /** La etapa cambió o la temporada se cerró/reabrió */
  alCambiarSiembra(s: Siembra): void {
    this.siembra = s;
    this.cdr.detectChanges();
  }

  fmtFechaLarga(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }

  editarSiembra(): void {
    this.router.navigate(['/cultivo/siembra', this.siembra!.id, 'editar']);
  }

  editarRegistro(item: TimelineItem): void {
    const ruta = { actividad: 'actividad', fumigacion: 'fumigacion', cosecha: 'cosecha' }[item.tipo];
    this.router.navigate(['/cultivo/siembra', this.siembra!.id, ruta, item.id]);
  }

  async eliminarRegistro(item: TimelineItem): Promise<void> {
    const nombre = item.tituloKey ? this.translate.instant(item.tituloKey) : item.titulo;
    const ok = await this.confirm.preguntar({
      titulo: this.translate.instant('temporadas.registro.deleteTitle'),
      mensaje: this.translate.instant('temporadas.registro.deleteMsg', { nombre, fecha: this.fmtFecha(item.fecha) }),
      confirmar: this.translate.instant('temporadas.registro.delete'),
      peligro: true,
    });
    if (!ok || !this.siembra?.id) return;
    const peticion = item.tipo === 'actividad'
      ? this.cultivoService.eliminarActividad(item.id)
      : item.tipo === 'fumigacion'
        ? this.cultivoService.eliminarFumigacion(item.id)
        : this.cultivoService.eliminarCosecha(item.id);
    peticion.subscribe({
      next: () => this.cargarDatos(this.siembra!.id!),
      error: (e) => {
        this.error = e?.error?.message || 'temporadas.registro.errors.delete';
        this.cdr.detectChanges();
      },
    });
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
        this.router.navigate(['/cultivo/lote', this.siembra!.loteId]);
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
    this.router.navigate(['/cultivo/siembra', this.siembra!.id, 'actividad']);
  }

  registrarFumigacion(): void {
    this.router.navigate(['/cultivo/siembra', this.siembra!.id, 'fumigacion']);
  }

  registrarCosecha(): void {
    this.router.navigate(['/cultivo/siembra', this.siembra!.id, 'cosecha']);
  }

  volver(): void {
    this.router.navigate(['/cultivo/lote', this.siembra?.loteId]);
  }
}
