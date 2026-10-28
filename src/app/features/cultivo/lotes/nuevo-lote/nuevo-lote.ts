import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { LanguageService } from '../../../../core/services/language.service';
import { aplicarTextosDibujo } from '../../../../shared/leaflet-draw-i18n';
import * as L from 'leaflet';
import 'leaflet-draw';

@Component({
  selector: 'app-nuevo-lote',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './nuevo-lote.html',
  styleUrl: './nuevo-lote.css',
})
export class NuevoLoteComponent implements OnInit, AfterViewInit, OnDestroy {

  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);

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
  error = '';                                  // clave de traducción
  errorParams: Record<string, unknown> = {};   // parámetros del mensaje
  exito = false;

  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;
  private drawControl: any = null;
  private locateBtnEl: HTMLElement | null = null;
  private langSub?: Subscription;

  constructor(
    private cultivoService: CultivoService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  private setError(key: string, params: Record<string, unknown> = {}): void {
    this.error = key;
    this.errorParams = params;
    this.cdr.detectChanges();
  }

  /** Número con hasta 2 decimales según el idioma activo */
  fmtArea(v: number): string {
    return new Intl.NumberFormat(this.lang.current(), {
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(v);
  }

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
        this.cdr.detectChanges();
      },
      error: () => this.setError('cultivo.lotes.new.errors.loadFarm'),
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    // Al cambiar de idioma: textos de la barra de dibujo y del botón GPS
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.actualizarTextoBotonGps();
      this.crearControlDibujo();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  private actualizarTextoBotonGps(): void {
    if (this.locateBtnEl) {
      this.locateBtnEl.innerHTML = '📍 ' + this.translate.instant('cultivo.fincas.new.myLocation');
    }
  }

  /** (Re)crea la barra de dibujo con los textos del idioma activo */
  private crearControlDibujo(): void {
    if (!this.map) return;
    aplicarTextosDibujo(this.translate);

    if (this.drawControl) this.map.removeControl(this.drawControl);

    this.drawControl = new (L as any).Control.Draw({
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
    this.map.addControl(this.drawControl);
  }

  buscarUbicacion(): void {
    if (!this.busquedaMapa) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.busquedaMapa)}&format=json&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          this.map.setView([Number.parseFloat(data[0].lat), Number.parseFloat(data[0].lon)], 16);
        } else {
          this.setError('cultivo.fincas.new.errors.notFound');
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
        this.locateBtnEl = btn;
        this.actualizarTextoBotonGps();
        L.DomEvent.on(btn, 'click', () => {
          navigator.geolocation.getCurrentPosition( // NOSONAR
            (pos) => {
              this.map.setView([pos.coords.latitude, pos.coords.longitude], 17);
            },
            () => alert(this.translate.instant('cultivo.fincas.new.geoError'))
          );
        });
        return btn;
      }
    }))();
    locateBtn.addTo(this.map);

    this.crearControlDibujo();

    this.map.on('draw:created', (event: any) => {
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
      this.cdr.detectChanges();
    });

    this.map.on('draw:deleted', () => {
      this.coordenadas   = null;
      this.areaCalculada = null;
      this.centroideLat  = null;
      this.centroideLng  = null;
      this.cdr.detectChanges();
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
      this.setError('cultivo.lotes.new.errors.nameRequired');
      return;
    }
    if (!this.coordenadas || !this.areaCalculada) {
      this.setError('cultivo.lotes.new.errors.drawRequired');
      return;
    }
    if (this.hectareasFinca !== null && this.areaCalculada > this.hectareasFinca) {
      this.setError('cultivo.lotes.new.errors.exceeds', {
        area: this.fmtArea(this.areaCalculada),
        max: this.fmtArea(this.hectareasFinca),
      });
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
            this.cdr.detectChanges();
            setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1200);
          },
          error: () => {
            this.exito = true;
            this.cdr.detectChanges();
            setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1200);
          }
        });
      },
      error: () => {
        this.guardando = false;
        this.setError('cultivo.lotes.new.errors.register');
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId]);
  }
}
