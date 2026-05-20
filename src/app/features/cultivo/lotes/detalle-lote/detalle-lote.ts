import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { Lote, Siembra } from '../../../../core/models/cultivo.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-detalle-lote',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-lote.html',
  styleUrl: './detalle-lote.css',
})
export class DetalleLoteComponent implements OnInit, AfterViewInit, OnDestroy {
  lote: Lote | null = null;
  siembra: Siembra | null = null;
  cargando = true;
  error = '';
  avanzando = false;
  ndviActivo = false;

  private map!: L.Map;
  private ndviLayer!: L.TileLayer.WMS;

  etapasList = [
    { key: 'GERMINACION', label: 'Germinación' },
    { key: 'CRECIMIENTO', label: 'Crecimiento' },
    { key: 'PRODUCCION',  label: 'Producción' },
    { key: 'COSECHA',     label: 'Cosecha' },
    { key: 'FINALIZADO',  label: 'Finalizado' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cultivoService.buscarLote(id).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.cargarSiembra(id);
      },
      error: () => {
        this.error = 'Error al cargar el lote.';
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
    this.map = L.map('mapa-lote').setView([4.5709, -74.2973], 15);

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

    // Capa NDVI Sentinel Hub
    const instanceId = '5838490d-ec4b-482d-84b8-f3ebc19fb69c';
    const baseWMS = `https://sh.dataspace.copernicus.eu/ogc/wms/${instanceId}`;

    this.ndviLayer = L.tileLayer.wms(baseWMS, {
      tileSize: 512,
      attribution: '© Copernicus/Sentinel Hub',
      layers: 'NDVI',
      time: '2026-04-01/2026-05-20',
      maxcc: 30,
      format: 'image/png',
      transparent: true,
    } as any);
  }

  private dibujarPoligono(): void {
    if (!this.lote?.coordenadas || !this.map) return;

    try {
      const coords: [number, number][] = JSON.parse(this.lote.coordenadas);
      const latlngs: L.LatLngTuple[] = coords.map(c => [c[0], c[1]]);

      const poligono = L.polygon(latlngs, {
        color: '#16a34a',
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(this.map);

      this.map.fitBounds(poligono.getBounds(), { padding: [40, 40] });
    } catch (e) {
      console.warn('Coordenadas inválidas');
    }
  }

  cargarSiembra(loteId: number): void {
    this.cultivoService.buscarSiembraPorLote(loteId).subscribe({
      next: (siembra) => {
        this.siembra = siembra;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
            this.dibujarPoligono();
          }
        }, 100);
      },
      error: () => {
        this.siembra = null;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
            this.dibujarPoligono();
          }
        }, 100);
      },
    });
  }

  toggleNdvi(): void {
    if (this.ndviActivo) {
      this.map.removeLayer(this.ndviLayer);
    } else {
      this.ndviLayer.addTo(this.map);
    }
    this.ndviActivo = !this.ndviActivo;
  }

  getEtapaIndex(): number {
    const etapas = ['GERMINACION', 'CRECIMIENTO', 'PRODUCCION', 'COSECHA', 'FINALIZADO'];
    return etapas.indexOf(this.siembra?.estadoCultivo || '');
  }

  getDiasTranscurridos(): number {
    if (!this.siembra?.fechaSiembra) return 0;
    const inicio = new Date(this.siembra.fechaSiembra);
    const hoy = new Date();
    return Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  avanzarEtapa(): void {
    if (!this.siembra?.id || this.avanzando) return;
    this.avanzando = true;
    this.cultivoService.avanzarEtapa(this.siembra.id).subscribe({
      next: (siembraActualizada) => {
        this.siembra = siembraActualizada;
        this.avanzando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al avanzar la etapa.';
        this.avanzando = false;
        this.cdr.detectChanges();
      },
    });
  }

  esFinalizado(): boolean {
    return this.siembra?.estadoCultivo === 'FINALIZADO';
  }

  entrarSiembra(): void {
    this.router.navigate(['/cultivo/siembra', this.siembra!.id]);
  }

  nuevaSiembra(): void {
    this.router.navigate([
      '/cultivo/finca', this.lote!.fincaId,
      'lote', this.lote!.id,
      'nueva-siembra'
    ]);
  }

  volver(): void {
    this.router.navigate(['/cultivo/finca', this.lote?.fincaId]);
  }
}
