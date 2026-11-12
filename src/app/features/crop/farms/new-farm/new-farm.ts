import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CultivoService } from '../../../../core/services/crop.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageService } from '../../../../core/services/language.service';
import * as L from 'leaflet';
import { GeocodingService } from '../../../../core/services/geocoding.service';

@Component({
  selector: 'app-nueva-finca',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './new-farm.html',
  styleUrls: ['../../crop-form.css', '../../crop-form-map.css', './new-farm.css'],
})
export class NuevaFincaComponent implements AfterViewInit, OnDestroy {
  private readonly avisos = inject(AvisosService);

  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);
  private geocoding = inject(GeocodingService);

  form = {
    nombre: '',
    ubicacion: '',
    hectareas: null as number | null,
  };

  busquedaMapa = '';
  centroideLat: number | null = null;
  centroideLng: number | null = null;

  guardando = false;
  error = '';          // clave de traducción
  exito = false;

  private map!: L.Map;
  private marcador: L.Marker | null = null;
  private locateBtnEl: HTMLElement | null = null;
  private langSub?: Subscription;

  constructor(
    private cultivoService: CultivoService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngAfterViewInit(): void {
    this.initMap();
    // Actualiza el texto del botón del mapa al cambiar de idioma
    this.langSub = this.translate.onLangChange.subscribe(() => this.actualizarTextoBotonGps());
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  /** Coordenadas con 4 decimales según el idioma activo */
  fmtCoord(v: number): string {
    return new Intl.NumberFormat(this.lang.current(), {
      minimumFractionDigits: 4, maximumFractionDigits: 4,
    }).format(v);
  }

  private actualizarTextoBotonGps(): void {
    if (this.locateBtnEl) {
      this.locateBtnEl.textContent ='📍 ' + this.translate.instant('cultivo.fincas.new.myLocation');
    }
  }

  private initMap(): void {
    const center: L.LatLngTuple = [4.5709, -74.2973];

    this.map = L.map('mapa-nueva-finca').setView(center, 12);

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

    // Botón GPS
    const locateBtn = new (L.Control.extend({
      options: { position: 'topright' },
      onAdd: () => {
        const btn = L.DomUtil.create('button', 'locate-btn');
        this.locateBtnEl = btn;
        this.actualizarTextoBotonGps();
        L.DomEvent.on(btn, 'click', () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
              this.map.setView(latlng, 16);
              this.colocarMarcador(latlng);
            },
            () => {
              this.error = 'cultivo.fincas.new.geoError';
              this.cdr.detectChanges();
            }
          );
        });
        return btn;
      }
    }))();
    locateBtn.addTo(this.map);

    // Clic en el mapa coloca el marcador
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.colocarMarcador(e.latlng);
    });
  }

  private colocarMarcador(latlng: L.LatLng): void {
    if (this.marcador) this.map.removeLayer(this.marcador);

    this.marcador = L.marker(latlng, {
      icon: L.icon({
        // Copiados desde node_modules/leaflet al compilar (assets en angular.json)
        iconUrl: 'leaflet/marker-icon.png',
        shadowUrl: 'leaflet/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })
    }).addTo(this.map);

    this.centroideLat = latlng.lat;
    this.centroideLng = latlng.lng;
    this.cdr.detectChanges();

    // Llena la ubicación con la vereda, municipio y departamento del punto
    this.geocoding.direccion({ lat: latlng.lat, lng: latlng.lng }).subscribe((texto) => {
      if (texto) {
        this.form.ubicacion = texto;
        this.cdr.detectChanges();
      }
    });
  }

  buscarUbicacion(): void {
    if (!this.busquedaMapa.trim()) return;
    this.error = '';
    this.geocoding.buscar(this.busquedaMapa).subscribe((punto) => {
      if (punto) {
        this.map.setView(L.latLng(punto.lat, punto.lng), 15);
      } else {
        this.error = 'cultivo.fincas.new.errors.notFound';
      }
      this.cdr.detectChanges();
    });
  }

  registrar(): void {
    if (!this.form.nombre || !this.form.ubicacion || !this.form.hectareas) {
      this.error = 'cultivo.fincas.new.errors.required';
      return;
    }
    if (!this.centroideLat || !this.centroideLng) {
      this.error = 'cultivo.fincas.new.errors.noMapLocation';
      return;
    }

    const usuario = this.authService.getUsuario();
    if (!usuario?.id) {
      this.error = 'cultivo.fincas.errors.noUser';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.cultivoService.registrarFinca({
      nombre: this.form.nombre,
      ubicacion: this.form.ubicacion,
      hectareas: this.form.hectareas,
      agricultorId: usuario.id,
    }).subscribe({
      next: (finca) => {
        // Guardar centroide
        this.cultivoService.actualizarCentroideFinca(finca.id!, {
          centroideLat: this.centroideLat!,
          centroideLng: this.centroideLng!,
        }).subscribe({
          next: () => {
            this.exito = true;
            this.cdr.detectChanges();
            this.avisos.exito('avisos.farm');
            this.router.navigate(['/crops']);
          },
          error: () => {
            this.exito = true;
            this.cdr.detectChanges();
            this.avisos.exito('avisos.farm');
            this.router.navigate(['/crops']);
          }
        });
      },
      error: () => {
        this.error = 'cultivo.fincas.new.errors.register';
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/crops']);
  }
}
