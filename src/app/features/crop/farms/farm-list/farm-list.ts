import { PrecargarDirective } from '../../../../shared/prefetch.directive';
import {
  SiembraActiva,
  SiembrasActivasService,
} from '../../../../core/services/active-plantings.service';
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ContarDirective } from '../../../../shared/count-up.directive';
import { Subscription, forkJoin, of, catchError } from 'rxjs';
import { CultivoService } from '../../../../core/services/crop.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageService } from '../../../../core/services/language.service';
import { Finca, Lote, nombreCultivo } from '../../../../core/models/crop.model';
import { escaparHtml } from '../../../../shared/html';
import { ESTADOS_LOTE, colorEstadoLote, puntosDelLote } from '../../lot-map';
import * as L from 'leaflet';
import { mensajeDeError } from '../../../../shared/error-message';

@Component({
  selector: 'app-lista-fincas',
  standalone: true,
  imports: [FormsModule, TranslatePipe, RouterLink, ContarDirective, PrecargarDirective],
  templateUrl: './farm-list.html',
  styleUrls: [
    '../../crop-ui.css',
    '../../crop-blocks.css',
    '../../crop-dialog.css',
    './farm-list.css',
  ],
})
export class ListaFincasComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly cultivoService = inject(CultivoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService);
  private readonly siembrasActivasSvc = inject(SiembrasActivasService);
  /** Siembras en curso de todas las fincas: se llega a cualquiera con un toque (null mientras carga) */
  siembrasActivas: SiembraActiva[] | null = null;
  readonly nombreCultivo = nombreCultivo;

  fincas: Finca[] = [];
  cargando = true;
  error = ''; // clave de traducción
  eliminandoId: number | null = null;
  fincaAEliminar: Finca | null = null;
  textoConfirmacion = '';
  fincaResaltada: number | null = null;
  /** Lotes de cada finca (para mostrar cuántos hay y cuántos están sembrados) */
  lotesPorFinca: Record<number, Lote[]> = {};

  private map!: L.Map;
  private marcadores = new Map<number, L.Marker>();
  /** Los lotes de todas las fincas, coloreados por estado */
  private lotesLayer = L.featureGroup();
  /** Estados que tienen al menos un lote dibujado (para la leyenda) */
  estadosEnMapa: string[] = [];
  readonly colorEstado = colorEstadoLote;
  private langSub?: Subscription;

  /** Palabra que el usuario debe escribir para confirmar (cambia con el idioma) */
  get palabraConfirmacion(): string {
    return this.translate.instant('cultivo.fincas.delete.confirmWord');
  }

  ngOnInit(): void {
    // Al cambiar de idioma se redibujan los marcadores para actualizar los popups
    this.langSub = this.translate.onLangChange.subscribe(() => {
      if (this.map && this.fincas.length > 0) {
        this.dibujarMarcadores(false);
        this.dibujarLotes(false);
      }
    });

    const usuario = this.authService.getUsuario();
    if (usuario?.id) {
      this.cultivoService.listarFincasPorAgricultor(usuario.id).subscribe({
        next: (fincas) => {
          this.fincas = fincas;
          this.cargando = false;
          this.cdr.detectChanges();
          this.cargarLotes();
          setTimeout(() => {
            if (this.map) {
              this.map.invalidateSize();
              this.dibujarMarcadores();
              // Si los lotes llegaron antes que este dibujo, se vuelven a encuadrar con ellos
              if (Object.keys(this.lotesPorFinca).length) this.dibujarLotes(true);
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

    const google = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: 'Google Satellite',
      maxZoom: 21,
      maxNativeZoom: 20,
    });
    const esri = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', maxZoom: 21, maxNativeZoom: 19 },
    );

    google.addTo(this.map);
    this.lotesLayer.addTo(this.map);
    L.control
      .layers(
        { 'Google Satellite': google, 'Esri Satellite': esri },
        {},
        { position: 'bottomleft' },
      )
      .addTo(this.map);
  }

  private dibujarMarcadores(ajustarVista = true): void {
    // Limpiar marcadores anteriores
    this.marcadores.forEach((m) => this.map.removeLayer(m));
    this.marcadores.clear();

    const fincasConUbicacion = this.fincas.filter((f) => f.centroideLat && f.centroideLng);
    const tEnter = this.translate.instant('cultivo.fincas.list.enterFarm');
    const tHa = this.translate.instant('cultivo.units.hectares');

    fincasConUbicacion.forEach((finca) => {
      const icono = L.divIcon({
        html: `<div class="marcador-finca"><i class="ti ti-home-2"></i></div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const marcador = L.marker([finca.centroideLat!, finca.centroideLng!], { icon: icono }).addTo(
        this.map,
      );

      // Popup con botón "Entrar" — permite ver el entorno antes de navegar
      const popupContent = `
        <div class="popup-finca">
          <div class="popup-finca-header">${escaparHtml(finca.nombre)}</div>
          <div class="popup-finca-body">
            ${escaparHtml(finca.ubicacion)}<br>
            ${escaparHtml(finca.hectareas)} ${escaparHtml(tHa)}
            <button class="popup-finca-btn" id="btn-entrar-${escaparHtml(finca.id)}">
              ${escaparHtml(tEnter)}
            </button>
          </div>
        </div>`;

      marcador.bindPopup(popupContent, { minWidth: 210 });

      // Vincular botón del popup tras abrirlo
      marcador.on('popupopen', () => {
        const btn = document.getElementById(`btn-entrar-${finca.id}`);
        btn?.addEventListener('click', () => this.router.navigate(['/crops/farm', finca.id]));
      });

      this.marcadores.set(finca.id!, marcador);
    });

    // Centrar para ver todos los marcadores (solo la primera vez / al eliminar)
    if (ajustarVista && fincasConUbicacion.length > 0) {
      const grupo = L.featureGroup([...this.marcadores.values()]);
      this.map.fitBounds(grupo.getBounds(), { padding: [60, 60], maxZoom: 14 });
    }
  }

  private cargarLotes(): void {
    if (!this.fincas.length) return;
    forkJoin(
      this.fincas.map((f) =>
        this.cultivoService.listarLotesPorFinca(f.id!).pipe(catchError(() => of([] as Lote[]))),
      ),
    ).subscribe((listas) => {
      this.fincas.forEach((f, i) => (this.lotesPorFinca[f.id!] = listas[i]));
      if (this.map) this.dibujarLotes(true);
      this.cdr.detectChanges();
    });
    // Siembras en curso de todas las fincas (las mismas consultas: el interceptor de copia breve las comparte)
    this.siembrasActivasSvc.listar(this.fincas).subscribe({
      next: (s) => {
        this.siembrasActivas = s;
        this.cdr.detectChanges();
      },
      error: () => {
        this.siembrasActivas = [];
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Todos los lotes de todas las fincas, coloreados por estado. Al tocar uno se abre su detalle.
   * Las fincas sin ubicación pero con lotes dibujados también quedan a la vista.
   */
  private dibujarLotes(ajustarVista: boolean): void {
    this.lotesLayer.clearLayers();
    const estados = new Set<string>();
    for (const finca of this.fincas) {
      for (const lote of this.lotesPorFinca[finca.id!] ?? []) {
        const puntos = puntosDelLote(lote.coordenadas);
        if (!puntos) continue;
        estados.add(lote.estado);
        const color = colorEstadoLote(lote.estado);
        const poligono = L.polygon(puntos, { color, weight: 2, fillOpacity: 0.35 });
        const estado = this.translate.instant('temporadas.lote.estado.' + lote.estado);
        poligono.bindTooltip(
          `<strong>${escaparHtml(lote.nombre)}</strong><br>${escaparHtml(finca.nombre)} · ${escaparHtml(estado)}`,
          { direction: 'top', sticky: true },
        );
        poligono.on('click', () => this.router.navigate(['/crops/plot', lote.id]));
        poligono.on('mouseover', () => poligono.setStyle({ fillOpacity: 0.6, weight: 3 }));
        poligono.on('mouseout', () => poligono.setStyle({ fillOpacity: 0.35, weight: 2 }));
        this.lotesLayer.addLayer(poligono);
      }
    }
    this.estadosEnMapa = ESTADOS_LOTE.filter((e) => estados.has(e));

    // Si hay fincas sin marcador (sin ubicación) pero con lotes, el encuadre debe incluirlos
    if (ajustarVista && this.lotesLayer.getLayers().length > 0) {
      const todo = L.featureGroup([
        ...this.marcadores.values(),
        ...(this.lotesLayer.getLayers() as L.Layer[]),
      ]);
      this.map.fitBounds(todo.getBounds(), { padding: [40, 40], maxZoom: 16 });
    }
  }

  // ── Helpers de template ──────────────────────────────────────

  lotesDe(f: Finca): Lote[] | undefined {
    return this.lotesPorFinca[f.id!];
  }

  enCultivo(f: Finca): number {
    return (this.lotesPorFinca[f.id!] ?? []).filter((l) => l.estado === 'EN_CULTIVO').length;
  }

  totalLotes(): number | null {
    const listas = Object.values(this.lotesPorFinca);
    return listas.length ? listas.reduce((s, l) => s + l.length, 0) : null;
  }

  totalEnCultivo(): number {
    return this.fincas.reduce((s, f) => s + this.enCultivo(f), 0);
  }

  fincasSinUbicacion(): number {
    return this.fincas.filter((f) => !f.centroideLat).length;
  }

  totalHectareas(): number {
    return this.fincas.reduce((sum, f) => sum + (f.hectareas ?? 0), 0);
  }

  promedioHectareas(): number {
    if (this.fincas.length === 0) return 0;
    return this.totalHectareas() / this.fincas.length;
  }

  /** Número con 1 decimal según el idioma activo */
  /** El mismo formato, como función suelta para el número que sube ([arContar]) */
  readonly comoDec = (valor: number) => this.fmtDec(valor);

  fmtDec(valor: number): string {
    return new Intl.NumberFormat(this.lang.current(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(valor);
  }

  // ── Interacción tarjeta ↔ mapa ───────────────────────────────

  /** Al pasar el mouse sobre una tarjeta, resalta el marcador en el mapa */
  resaltarFinca(finca: Finca): void {
    this.fincaResaltada = finca.id ?? null;
    const marcador = finca.id != null ? this.marcadores.get(finca.id) : null;
    if (marcador) {
      const el = marcador.getElement();
      el?.querySelector('.marcador-finca')?.classList.add('marcador-finca--activo');
    }
  }

  quitarResaltado(): void {
    if (this.fincaResaltada != null) {
      const marcador = this.marcadores.get(this.fincaResaltada);
      const el = marcador?.getElement();
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
    this.router.navigate(['/crops/farm', id]);
  }

  nuevaFinca(): void {
    this.router.navigate(['/crops/new-farm']);
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
        this.fincas = this.fincas.filter((f) => f.id !== this.fincaAEliminar!.id);
        this.fincaAEliminar = null;
        this.textoConfirmacion = '';
        this.eliminandoId = null;
        this.dibujarMarcadores();
        this.cdr.detectChanges();
      },
      error: (e) => {
        // p. ej. "El lote 'Norte' tiene una siembra en curso..."
        this.error = mensajeDeError(e, 'cultivo.fincas.errors.delete');
        this.fincaAEliminar = null;
        this.eliminandoId = null;
        this.cdr.detectChanges();
      },
    });
  }
}
