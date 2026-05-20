import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { Finca, Lote } from '../../../../core/models/cultivo.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-detalle-finca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-finca.html',
  styleUrl: './detalle-finca.css',
})
export class DetalleFincaComponent implements OnInit, AfterViewInit, OnDestroy {
  finca: Finca | null = null;
  lotes: Lote[] = [];
  cargando = true;
  error = '';
  fincaId!: number;
  eliminando = false;
  loteAEliminar: Lote | null = null;
  textoConfirmacion = '';

  private map!: L.Map;
  private poligonosLayer: L.FeatureGroup = new L.FeatureGroup();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fincaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cultivoService.buscarFinca(this.fincaId).subscribe({
      next: (finca) => {
        this.finca = finca;
        this.cargarLotes(this.fincaId);
      },
      error: () => {
        this.error = 'Error al cargar la finca.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    const center: L.LatLngTuple = [4.5709, -74.2973];
    this.map = L.map('mapa-finca').setView(center, 13);

    const google = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { attribution: 'Google Satellite', maxZoom: 21, maxNativeZoom: 20 }
    );
    const esri = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', maxZoom: 21, maxNativeZoom: 19 }
    );

    google.addTo(this.map);
    L.control.layers(
      { 'Google Satellite': google, 'Esri Satellite': esri },
      {},
      { position: 'bottomleft' }
    ).addTo(this.map);

    this.poligonosLayer.addTo(this.map);
  }

  private dibujarLotes(): void {
    this.poligonosLayer.clearLayers();

    this.lotes.forEach(lote => {
      if (!lote.coordenadas) return;

      try {
        const coords: [number, number][] = JSON.parse(lote.coordenadas);
        const latlngs: L.LatLngTuple[] = coords.map(c => [c[0], c[1]]);

        const poligono = L.polygon(latlngs, {
          color: this.getColorEstado(lote.estado),
          fillOpacity: 0.3,
          weight: 2,
        });

        // Popup con nombre y estado
        poligono.bindTooltip(
          `<strong>${lote.nombre}</strong><br>${this.getEstadoLabel(lote.estado)}<br>📐 ${lote.area} ha`,
          { permanent: false, direction: 'center' }
        );

        // Clic navega al lote
        poligono.on('click', () => {
          this.router.navigate(['/cultivo/lote', lote.id]);
        });

        // Highlight al pasar el mouse
        poligono.on('mouseover', () => {
          poligono.setStyle({ fillOpacity: 0.6, weight: 3 });
        });
        poligono.on('mouseout', () => {
          poligono.setStyle({ fillOpacity: 0.3, weight: 2 });
        });

        this.poligonosLayer.addLayer(poligono);

      } catch (e) {
        console.warn(`Coordenadas inválidas en lote ${lote.nombre}`);
      }
    });

    // Centrar mapa según finca o polígonos
    if (this.finca?.centroideLat && this.finca?.centroideLng) {
      this.map.setView([this.finca.centroideLat, this.finca.centroideLng], 16);
    } else if (this.poligonosLayer.getLayers().length > 0) {
      this.map.fitBounds(this.poligonosLayer.getBounds(), { padding: [30, 30] });
    }
  }

cargarLotes(fincaId: number): void {
  this.cultivoService.listarLotesPorFinca(fincaId).subscribe({
    next: (lotes) => {
      this.lotes = lotes;
      this.cargando = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.dibujarLotes();
        }
      }, 100);
    },
    error: () => {
      this.error = 'Error al cargar los lotes.';
      this.cargando = false;
      this.cdr.detectChanges();
    },
  });
}

  private getColorEstado(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return '#16a34a';
      case 'EN_CULTIVO': return '#f59e0b';
      case 'EN_DESCANSO': return '#6b7280';
      default: return '#16a34a';
    }
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'estado-disponible';
      case 'EN_CULTIVO': return 'estado-cultivo';
      case 'EN_DESCANSO': return 'estado-descanso';
      default: return '';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return '🟢 Disponible';
      case 'EN_CULTIVO': return '🟡 En cultivo';
      case 'EN_DESCANSO': return '⚫ En descanso';
      default: return estado;
    }
  }

  entrarLote(id: number): void {
    this.router.navigate(['/cultivo/lote', id]);
  }

  nuevoLote(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId, 'nuevo-lote']);
  }

  iniciarEliminacionLote(event: Event, lote: Lote): void {
    event.stopPropagation();
    this.loteAEliminar = lote;
    this.textoConfirmacion = '';
  }

  cancelarEliminacion(): void {
    this.loteAEliminar = null;
    this.textoConfirmacion = '';
  }

  confirmarEliminacionLote(): void {
    if (this.textoConfirmacion !== 'confirmar' || !this.loteAEliminar) return;
    this.eliminando = true;
    this.cultivoService.eliminarLote(this.loteAEliminar.id!).subscribe({
      next: () => {
        this.lotes = this.lotes.filter(l => l.id !== this.loteAEliminar!.id);
        this.loteAEliminar = null;
        this.textoConfirmacion = '';
        this.eliminando = false;
        this.dibujarLotes();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al eliminar el lote.';
        this.eliminando = false;
        this.cdr.detectChanges();
      },
    });
  }

  volver(): void {
    this.router.navigate(['/cultivo']);
  }
}
