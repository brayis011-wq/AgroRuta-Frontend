import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import {
  Siembra,
  ActividadCultivo,
  Fumigacion,
  Cosecha,
} from '../../../../core/models/cultivo.model';
import { WeatherWidgetComponent } from '../../../weather/weather-widget/weather-widget.component';

interface TimelineItem {
  fecha: string;
  tipo: 'actividad' | 'fumigacion' | 'cosecha';
  titulo: string;
  detalle: string;
  extra?: string;
}

@Component({
  selector: 'app-detalle-siembra',
  standalone: true,
  imports: [CommonModule, FormsModule, WeatherWidgetComponent],
  templateUrl: './detalle-siembra.html',
  styleUrl: './detalle-siembra.css',
})
export class DetalleSiembraComponent implements OnInit {
  siembra: Siembra | null = null;
  actividades: ActividadCultivo[] = [];
  fumigaciones: Fumigacion[] = [];
  cosechas: Cosecha[] = [];
  totalKg = 0;
  cargando = true;
  error = '';
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
        this.error = 'Error al cargar la siembra.';
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
      fecha: a.fecha,
      tipo: 'actividad',
      titulo: a.tipo,
      detalle: a.descripcion,
    }));

    this.fumigaciones.forEach(f => items.push({
      fecha: f.fecha,
      tipo: 'fumigacion',
      titulo: f.producto,
      detalle: `${f.dosis} ${f.unidadMedida} · ${f.areaAplicada} ha`,
      extra: f.observaciones,
    }));

    this.cosechas.forEach(c => items.push({
      fecha: c.fecha,
      tipo: 'cosecha',
      titulo: `${c.cantidadKg} kg`,
      detalle: `Calidad: ${c.calidad}`,
      extra: c.observaciones,
    }));

    this.timelineCompleto = items.sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
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

  iniciarEliminacion(): void {
    this.mostrarConfirmacion = true;
    this.textoConfirmacion = '';
  }

  cancelarEliminacion(): void {
    this.mostrarConfirmacion = false;
    this.textoConfirmacion = '';
  }

  confirmarEliminacion(): void {
    if (this.textoConfirmacion !== 'confirmar' || !this.siembra) return;
    this.eliminando = true;
    this.cultivoService.eliminarSiembra(this.siembra.id!).subscribe({
      next: () => {
        this.router.navigate(['/cultivo/lote', this.siembra!.loteId]);
      },
      error: () => {
        this.error = 'Error al eliminar la siembra.';
        this.eliminando = false;
        this.mostrarConfirmacion = false;
        this.cdr.detectChanges();
      },
    });
  }

  getDiasTranscurridos(): number {
    if (!this.siembra?.fechaSiembra) return 0;
    const inicio = new Date(this.siembra.fechaSiembra);
    return Math.floor((new Date().getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  getUltimaActividad(): string {
    if (this.actividades.length === 0) return 'Sin actividades';
    const ultima = this.actividades[this.actividades.length - 1];
    return `${ultima.tipo} - ${ultima.fecha}`;
  }

  getUltimaFumigacion(): string {
    if (this.fumigaciones.length === 0) return 'Sin fumigaciones';
    const ultima = this.fumigaciones[this.fumigaciones.length - 1];
    return `${ultima.producto} - ${ultima.fecha}`;
  }

  getAlerta(): string {
    if (this.fumigaciones.length === 0) return '🔴 Sin fumigaciones registradas';
    const ultima = new Date(this.fumigaciones[this.fumigaciones.length - 1].fecha);
    const dias = Math.floor((new Date().getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > 7) return `🔴 Hace ${dias} días sin fumigación`;
    if (dias > 5) return `🟡 Hace ${dias} días sin fumigación`;
    return '🟢 Cultivo al día';
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
