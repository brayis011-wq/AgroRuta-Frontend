import {
  Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';
import { LanguageService } from '../../../../core/services/language.service';
import { Finca } from '../../../../core/models/cultivo.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-lista-fincas',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './lista-fincas.html',
  styleUrl: './lista-fincas.css',
})
export class ListaFincasComponent implements OnInit, AfterViewInit, OnDestroy {
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  fincas: Finca[] = [];
  cargando = true;
  error = '';                       // clave de traducción
  eliminandoId: number | null = null;
  fincaAEliminar: Finca | null = null;
  textoConfirmacion = '';
  fincaResaltada: number | null = null;

  private map!: L.Map;
  private marcadores: Map<number, L.Marker> = new Map();
  private langSub?: Subscription;

  constructor(
    private cultivoService: CultivoService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Palabra que el usuario debe escribir para confirmar (cambia con el idioma) */
  get palabraConfirmacion(): string {
    return this.translate.instant('cultivo.fincas.delete.confirmWord');
  }

  ngOnInit(): void {
    // Al cambiar de idioma se redibujan los marcadores para actualizar los popups
    this.langSub = this.translate.onLangChange.subscribe(() => {
      if (this.map && this.fincas.length > 0) this.dibujarMarcadores(false);
    });

    const usuario = this.authService.getUsuario();
    if (usuario?.id) {
      this.cultivoService.listarFincasPorAgricultor(usuario.id).subscribe({
        next: (fincas) => {
          this.fincas = fincas;
          this.cargando = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.map) {
              this.map.invalidateSize();
              this.dibujarMarcadores();
            }
          }, 100);
        },
        error: () => {
          this.error = 'cultivo.fincas.errors.load';
          this.cargando = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.error = 'cultivo.fincas.errors.noUser';
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map('mapa-fincas').setView([4.5709, -74.2973], 8);

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
  }

  private dibujarMarcadores(ajustarVista = true): void {
    // Limpiar marcadores anteriores
    this.marcadores.forEach(m => this.map.removeLayer(m));
    this.marcadores.clear();

    const fincasConUbicacion = this.fincas.filter(f => f.centroideLat && f.centroideLng);
    const tEnter = this.translate.instant('cultivo.fincas.list.enterFarm');
    const tHa = this.translate.instant('cultivo.units.hectares');

    fincasConUbicacion.forEach(finca => {
      const icono = L.divIcon({
        html: `<div class="marcador-finca">🏡</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const marcador = L.marker(
        [finca.centroideLat!, finca.centroideLng!],
        { icon: icono }
      ).addTo(this.map);

      // Popup con botón "Entrar" — permite ver el entorno antes de navegar
      const popupContent = `
        <div class="popup-finca">
          <div class="popup-finca-header">🏡 ${finca.nombre}</div>
          <div class="popup-finca-body">
            📍 ${finca.ubicacion}<br>
            📐 ${finca.hectareas} ${tHa}
            <button class="popup-finca-btn" id="btn-entrar-${finca.id}">
              ${tEnter}
            </button>
          </div>
        </div>`;

      marcador.bindPopup(popupContent, { minWidth: 210 });

      // Vincular botón del popup tras abrirlo
      marcador.on('popupopen', () => {
        const btn = document.getElementById(`btn-entrar-${finca.id}`);
        btn?.addEventListener('click', () => this.router.navigate(['/cultivo/finca', finca.id]));
      });

      this.marcadores.set(finca.id!, marcador);
    });

    // Centrar para ver todos los marcadores (solo la primera vez / al eliminar)
    if (ajustarVista && fincasConUbicacion.length > 0) {
      const grupo = L.featureGroup([...this.marcadores.values()]);
      this.map.fitBounds(grupo.getBounds(), { padding: [60, 60], maxZoom: 14 });
    }
  }

  // ── Helpers de template ──────────────────────────────────────

  fincasSinUbicacion(): number {
    return this.fincas.filter(f => !f.centroideLat).length;
  }

  totalHectareas(): number {
    return this.fincas.reduce((sum, f) => sum + (f.hectareas ?? 0), 0);
  }

  promedioHectareas(): number {
    if (this.fincas.length === 0) return 0;
    return this.totalHectareas() / this.fincas.length;
  }

  /** Número con 1 decimal según el idioma activo */
  fmtDec(valor: number): string {
    return new Intl.NumberFormat(this.lang.current(), {
      minimumFractionDigits: 1, maximumFractionDigits: 1,
    }).format(valor);
  }

  // ── Interacción tarjeta ↔ mapa ───────────────────────────────

  /** Al pasar el mouse sobre una tarjeta, resalta el marcador en el mapa */
  resaltarFinca(finca: Finca): void {
    this.fincaResaltada = finca.id ?? null;
    const marcador = finca.id != null ? this.marcadores.get(finca.id) : null;
    if (marcador) {
      const el = (marcador as any)._icon as HTMLElement | null;
      el?.querySelector('.marcador-finca')?.classList.add('marcador-finca--activo');
    }
  }

  quitarResaltado(): void {
    if (this.fincaResaltada != null) {
      const marcador = this.marcadores.get(this.fincaResaltada);
      const el = (marcador as any)?._icon as HTMLElement | null;
      el?.querySelector('.marcador-finca')?.classList.remove('marcador-finca--activo');
    }
    this.fincaResaltada = null;
  }

  /** Botón 🗺️ — centra y abre el popup de esa finca en el mapa */
  centrarEnFinca(finca: Finca): void {
    const marcador = finca.id != null ? this.marcadores.get(finca.id) : null;
    if (!marcador) return;
    this.map.flyTo([finca.centroideLat!, finca.centroideLng!], 15, { duration: 1 });
    setTimeout(() => marcador.openPopup(), 900);
  }

  // ── Navegación ───────────────────────────────────────────────

  entrarFinca(id: number): void {
    this.router.navigate(['/cultivo/finca', id]);
  }

  nuevaFinca(): void {
    this.router.navigate(['/cultivo/nueva-finca']);
  }

  // ── Eliminación ──────────────────────────────────────────────

  iniciarEliminacion(event: Event, finca: Finca): void {
    event.stopPropagation();
    this.fincaAEliminar = finca;
    this.textoConfirmacion = '';
  }

  cancelarEliminacion(): void {
    this.fincaAEliminar = null;
    this.textoConfirmacion = '';
  }

  confirmarEliminacion(): void {
    if (this.textoConfirmacion !== this.palabraConfirmacion || !this.fincaAEliminar) return;
    this.eliminandoId = this.fincaAEliminar.id!;
    this.cultivoService.eliminarFinca(this.fincaAEliminar.id!).subscribe({
      next: () => {
        this.fincas = this.fincas.filter(f => f.id !== this.fincaAEliminar!.id);
        this.fincaAEliminar = null;
        this.textoConfirmacion = '';
        this.eliminandoId = null;
        this.dibujarMarcadores();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'cultivo.fincas.errors.delete';
        this.eliminandoId = null;
        this.cdr.detectChanges();
      },
    });
  }
}
