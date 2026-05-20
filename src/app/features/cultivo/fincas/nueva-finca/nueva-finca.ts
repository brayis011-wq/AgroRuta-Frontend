import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';
import * as L from 'leaflet';

@Component({
  selector: 'app-nueva-finca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-finca.html',
  styleUrl: './nueva-finca.css',
})
export class NuevaFincaComponent implements AfterViewInit, OnDestroy {

  form = {
    nombre: '',
    ubicacion: '',
    hectareas: null as number | null,
  };

  busquedaMapa = '';
  centroideLat: number | null = null;
  centroideLng: number | null = null;

  guardando = false;
  error = '';
  exito = false;

  private map!: L.Map;
  private marcador: L.Marker | null = null;

  constructor(
    private cultivoService: CultivoService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
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
        btn.innerHTML = '📍 Mi ubicación';
        L.DomEvent.on(btn, 'click', () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
              this.map.setView(latlng, 16);
              this.colocarMarcador(latlng);
            },
            () => alert('No se pudo obtener tu ubicación.')
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
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })
    }).addTo(this.map);

    this.centroideLat = latlng.lat;
    this.centroideLng = latlng.lng;

    // Reverse geocoding para llenar ubicacion automáticamente
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        if (data?.address) {
          const a = data.address;
          const partes = [
            a.village || a.town || a.suburb || '',
            a.county || a.state_district || '',
            a.state || ''
          ].filter(Boolean);
          this.form.ubicacion = partes.join(', ');
        }
      });
  }

  buscarUbicacion(): void {
    if (!this.busquedaMapa) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.busquedaMapa)}&format=json&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          const latlng = L.latLng(parseFloat(data[0].lat), parseFloat(data[0].lon));
          this.map.setView(latlng, 15);
        } else {
          this.error = 'No se encontró esa ubicación.';
        }
      });
  }

  registrar(): void {
    if (!this.form.nombre || !this.form.ubicacion || !this.form.hectareas) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }
    if (!this.centroideLat || !this.centroideLng) {
      this.error = 'Marca la ubicación de la finca en el mapa.';
      return;
    }

    const usuario = this.authService.getUsuario();
    if (!usuario?.id) {
      this.error = 'No se encontró el usuario. Por favor inicia sesión de nuevo.';
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
            setTimeout(() => this.router.navigate(['/cultivo']), 1200);
          },
          error: () => {
            this.exito = true;
            setTimeout(() => this.router.navigate(['/cultivo']), 1200);
          }
        });
      },
      error: () => {
        this.error = 'Error al registrar la finca. Intenta de nuevo.';
        this.guardando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo']);
  }
}
