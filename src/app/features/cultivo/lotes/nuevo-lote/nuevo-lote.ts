import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import * as L from 'leaflet';
import 'leaflet-draw';

@Component({
  selector: 'app-nuevo-lote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nuevo-lote.html',
  styleUrl: './nuevo-lote.css',
})
export class NuevoLoteComponent implements OnInit, AfterViewInit, OnDestroy {

  form = { nombre: '' };

  fincaId!: number;
  finca: any = null;
  hectareasFinca: number | null = null;

  areaCalculada: number | null = null;
  coordenadas: string | null = null;
  centroideLat: number | null = null;
  centroideLng: number | null = null;
  centroFinca: L.LatLngTuple | null = null;
  busquedaMapa = '';

  guardando = false;
  error = '';
  exito = false;

  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;

  constructor(
    private cultivoService: CultivoService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.fincaId = Number(this.route.snapshot.paramMap.get('fincaId'));
    this.cultivoService.buscarFinca(this.fincaId).subscribe({
      next: (finca) => {
        this.finca = finca;
        this.hectareasFinca = finca.hectareas;
        if (finca.centroideLat && finca.centroideLng) {
          if (this.map) {
            this.map.setView([finca.centroideLat, finca.centroideLng], 17);
          } else {
            this.centroFinca = [finca.centroideLat, finca.centroideLng];
          }
        }
      },
      error: () => this.error = 'No se pudo cargar la información de la finca.',
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  buscarUbicacion(): void {
    if (!this.busquedaMapa) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.busquedaMapa)}&format=json&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          this.map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 16);
        } else {
          this.error = 'No se encontró esa ubicación.';
        }
      });
  }

  private initMap(): void {
    const center: L.LatLngTuple = [4.5709, -74.2973];

    this.map = L.map('mapa-nuevo-lote').setView(center, 14);

    const esri = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', maxZoom: 21, maxNativeZoom: 19 }
    );

    const google = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { attribution: 'Google Satellite', maxZoom: 21, maxNativeZoom: 20 }
    );

    google.addTo(this.map);

    L.control.layers(
      { 'Google Satellite': google, 'Esri Satellite': esri },
      {},
      { position: 'bottomleft' }
    ).addTo(this.map);

    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    const locateBtn = new (L.Control.extend({
      options: { position: 'topright' },
      onAdd: () => {
        const btn = L.DomUtil.create('button', 'locate-btn');
        btn.innerHTML = '📍 Mi ubicación';
        L.DomEvent.on(btn, 'click', () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.map.setView([pos.coords.latitude, pos.coords.longitude], 17);
            },
            () => alert('No se pudo obtener tu ubicación.')
          );
        });
        return btn;
      }
    }))();
    locateBtn.addTo(this.map);

    const drawControl = new (L as any).Control.Draw({
      edit: { featureGroup: this.drawnItems, remove: true },
      draw: {
        polygon: {
          showArea: true,
          shapeOptions: { color: '#16a34a', fillOpacity: 0.25 },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });
    this.map.addControl(drawControl);

    this.map.on((L as any).Draw.Event.CREATED, (event: any) => {
      this.drawnItems.clearLayers();
      const layer = event.layer;
      this.drawnItems.addLayer(layer);
      const latlngs: L.LatLng[] = layer.getLatLngs()[0];
      this.coordenadas   = JSON.stringify(latlngs.map(p => [p.lat, p.lng]));
      this.areaCalculada = this.calcularAreaHectareas(latlngs);
      const c            = this.calcularCentroide(latlngs);
      this.centroideLat  = c.lat;
      this.centroideLng  = c.lng;
      this.error = '';
    });

    this.map.on((L as any).Draw.Event.DELETED, () => {
      this.coordenadas   = null;
      this.areaCalculada = null;
      this.centroideLat  = null;
      this.centroideLng  = null;
    });

    if (this.centroFinca) {
      this.map.setView(this.centroFinca, 17);
    }
  }

  private calcularAreaHectareas(latlngs: L.LatLng[]): number {
    const R = 6371000;
    const n = latlngs.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const j    = (i + 1) % n;
      const lat1 = latlngs[i].lat * Math.PI / 180;
      const lat2 = latlngs[j].lat * Math.PI / 180;
      const lng1 = latlngs[i].lng * Math.PI / 180;
      const lng2 = latlngs[j].lng * Math.PI / 180;
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.round(Math.abs(area * R * R / 2) / 10000 * 100) / 100;
  }

  private calcularCentroide(latlngs: L.LatLng[]): { lat: number; lng: number } {
    const lat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
    const lng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;
    return { lat, lng };
  }

  registrar(): void {
    if (!this.form.nombre) {
      this.error = 'Por favor ingresa el nombre del lote.';
      return;
    }
    if (!this.coordenadas || !this.areaCalculada) {
      this.error = 'Dibuja el polígono del lote en el mapa antes de continuar.';
      return;
    }
    if (this.hectareasFinca !== null && this.areaCalculada > this.hectareasFinca) {
      this.error = `El lote (${this.areaCalculada} ha) supera el area de la finca (${this.hectareasFinca} ha).`;
      return;
    }

    this.guardando = true;
    this.error = '';

    this.cultivoService.registrarLote({
      nombre: this.form.nombre,
      area: this.areaCalculada,
      fincaId: this.fincaId,
    }).subscribe({
      next: (lote) => {
        this.cultivoService.actualizarGeometriaLote(lote.id!, {
          coordenadas: this.coordenadas!,
          area: this.areaCalculada!,
          centroideLat: this.centroideLat!,
          centroideLng: this.centroideLng!,
        }).subscribe({
          next: () => {
            this.exito = true;
            setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1200);
          },
          error: () => {
            this.exito = true;
            setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1200);
          }
        });
      },
      error: () => {
        this.error = 'Error al registrar el lote. Intenta de nuevo.';
        this.guardando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId]);
  }
}
