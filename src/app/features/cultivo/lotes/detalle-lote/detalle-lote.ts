import {
  AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin, of, catchError, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { LanguageService } from '../../../../core/services/language.service';
import { FincaActivaService } from '../../../../core/services/finca-activa.service';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { formatoFecha, formatoNumero } from '../../../../shared/formato';
import {
  EstadoLote, Lote, Siembra, nombreCultivo as nombreDeCultivo, siembraActiva,
} from '../../../../core/models/cultivo.model';
import { environment } from '../../../../../environments/environment';
import { rangoNdvi } from '../../../../shared/ndvi';
import { CicloEtapasComponent } from '../../siembra/ciclo-etapas/ciclo-etapas';
import { diasEntre, hoyIso } from '../../siembra/ciclo-etapas/ciclo-etapas.logic';

export interface Temporada {
  siembra: Siembra;
  dias: number;
  kg: number | null;
}

@Component({
  selector: 'app-detalle-lote',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, CicloEtapasComponent],
  templateUrl: './detalle-lote.html',
  styleUrls: ['../../cultivo-ui.css', '../../cultivo-dialogo.css', './detalle-lote.css', './detalle-lote-temporadas.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleLoteComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly nombreCultivo = nombreDeCultivo;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cultivoService = inject(CultivoService);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);
  private confirm = inject(ConfirmService);
  private fincaActiva = inject(FincaActivaService);

  readonly lote = signal<Lote | null>(null);
  readonly siembra = signal<Siembra | null>(null);
  readonly temporadas = signal<Temporada[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly ndviActivo = signal(false);

  // edición del lote
  readonly editando = signal(false);
  readonly guardando = signal(false);
  formNombre = '';
  formArea: number | null = null;

  readonly diasEnCampo = computed(() => diasEntre(this.siembra()?.fechaSiembra, hoyIso()));
  readonly estado = computed<EstadoLote>(() => this.lote()?.estado ?? 'DISPONIBLE');

  private map?: L.Map;
  private poligono?: L.Polygon;
  private rutaSub?: Subscription;
  private ndviLayer?: L.TileLayer.WMS;
  private loteId = 0;

  ngOnInit(): void {
    // Angular reutiliza esta página al pasar de un lote a otro (p. ej. desde el panel
    // izquierdo): hay que recargar cada vez que cambia el id de la ruta.
    const params$ = this.route.paramMap ?? of(this.route.snapshot.paramMap);
    this.rutaSub = params$.subscribe((p) => this.cargar(Number(p.get('id'))));
  }

  private cargar(id: number): void {
    this.loteId = id;
    this.lote.set(null);
    this.siembra.set(null);
    this.temporadas.set([]);
    this.error.set('');
    this.editando.set(false);
    this.cargando.set(true);
    if (this.poligono) { this.map?.removeLayer(this.poligono); this.poligono = undefined; }
    if (this.ndviActivo() && this.ndviLayer) { this.map?.removeLayer(this.ndviLayer); this.ndviActivo.set(false); }

    this.cultivoService.buscarLote(id).subscribe({
      next: (lote) => {
        this.lote.set(lote);
        this.cargarTemporadas();
      },
      error: () => {
        this.error.set('lotes.detail.errors.load');
        this.cargando.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.rutaSub?.unsubscribe();
    this.map?.remove();
  }

  /** Siembra en curso y temporadas anteriores (con lo cosechado en cada una) */
  cargarTemporadas(): void {
    const id = this.loteId;
    this.cultivoService.historialLote(id).pipe(catchError(() => of([] as Siembra[]))).subscribe((todas) => {
      if (id !== this.loteId) return; // ya se cambió a otro lote
      this.siembra.set(todas.find(siembraActiva) ?? null);
      const pasadas = todas.filter((s) => !siembraActiva(s));
      this.temporadas.set(pasadas.map((s) => ({
        siembra: s, dias: diasEntre(s.fechaSiembra, s.fechaFin ?? hoyIso()), kg: null,
      })));
      this.cargando.set(false);
      this.refrescarMapa();

      if (!pasadas.length) return;
      forkJoin(pasadas.map((s) => this.cultivoService.totalKgCosechado(s.id!).pipe(catchError(() => of(null)))))
        .subscribe((kgs) => this.temporadas.update((ts) => ts.map((t, i) => ({ ...t, kg: kgs[i] ?? 0 }))));
    });
  }

  /** Cambió la etapa o se cerró la temporada */
  alCambiarSiembra(s: Siembra): void {
    if (siembraActiva(s)) {
      this.siembra.set(s);
      return;
    }
    // se cerró: el lote cambió de estado y la siembra pasa al historial
    this.cultivoService.buscarLote(this.loteId).subscribe((l) => this.lote.set(l));
    this.cargarTemporadas();
    this.fincaActiva.refrescarLotes();
  }

  // ── Estado y edición del lote ─────────────────────────────────────

  async cambiarEstado(estado: 'DISPONIBLE' | 'EN_DESCANSO'): Promise<void> {
    if (estado === 'EN_DESCANSO') {
      const ok = await this.confirm.preguntar({
        titulo: this.translate.instant('temporadas.lote.restTitle'),
        mensaje: this.translate.instant('temporadas.lote.restMsg'),
        confirmar: this.translate.instant('temporadas.lote.rest'),
      });
      if (!ok) return;
    }
    this.cultivoService.cambiarEstadoLote(this.loteId, estado).subscribe({
      next: (l) => { this.lote.set(l); this.error.set(''); },
      error: (e) => this.error.set(e?.error?.message || 'temporadas.lote.errors.state'),
    });
  }

  editar(): void {
    const l = this.lote();
    if (!l) return;
    this.formNombre = l.nombre;
    this.formArea = l.area;
    this.editando.set(true);
  }

  guardarLote(): void {
    const l = this.lote();
    if (!l || !this.formNombre.trim() || !this.formArea || this.formArea <= 0) return;
    this.guardando.set(true);
    this.cultivoService.actualizarLote(this.loteId, {
      nombre: this.formNombre.trim(), area: this.formArea, fincaId: l.fincaId,
    }).subscribe({
      next: (actualizado) => {
        this.lote.set(actualizado);
        this.guardando.set(false);
        this.editando.set(false);
        this.error.set('');
        this.fincaActiva.refrescarLotes();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e?.error?.message || 'temporadas.lote.errors.save');
      },
    });
  }

  // ── Formato ───────────────────────────────────────────────────────

  fmtFecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }

  fmtNum(v: number | null | undefined, dec = 0): string {
    return formatoNumero(v, this.lang.current(), dec);
  }

  // ── Navegación ────────────────────────────────────────────────────

  nuevaSiembra(): void {
    const l = this.lote();
    if (!l) return;
    this.router.navigate(['/cultivo/finca', l.fincaId, 'lote', l.id, 'nueva-siembra']);
  }

  volver(): void {
    this.router.navigate(['/cultivo/finca', this.lote()?.fincaId]);
  }

  // ── Mapa ──────────────────────────────────────────────────────────

  toggleNdvi(): void {
    if (!this.map || !this.ndviLayer) return;
    if (this.ndviActivo()) this.map.removeLayer(this.ndviLayer);
    else this.ndviLayer.addTo(this.map);
    this.ndviActivo.update((v) => !v);
  }

  private initMap(): void {
    const el = document.getElementById('mapa-lote');
    if (!el) return;
    this.map = L.map(el).setView([4.5709, -74.2973], 15);
    const google = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { attribution: 'Google Satellite', maxZoom: 21, maxNativeZoom: 20 });
    const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', maxZoom: 21, maxNativeZoom: 19 });
    google.addTo(this.map);
    L.control.layers({ 'Google Satellite': google, 'Esri Satellite': esri }, {}, { position: 'bottomleft' }).addTo(this.map);
    this.ndviLayer = L.tileLayer.wms(`https://sh.dataspace.copernicus.eu/ogc/wms/${environment.sentinelInstanceId}`, {
      tileSize: 512,
      attribution: '© Copernicus/Sentinel Hub',
      layers: 'NDVI',
      time: rangoNdvi(environment.ndviDias),
      maxcc: 30,
      format: 'image/png',
      transparent: true,
    } as any);
  }

  private refrescarMapa(): void {
    setTimeout(() => {
      if (!this.map) return;
      this.map.invalidateSize();
      this.dibujarPoligono();
    }, 100);
  }

  private dibujarPoligono(): void {
    const coordenadas = this.lote()?.coordenadas;
    if (!coordenadas || !this.map) return;
    try {
      const coords: [number, number][] = JSON.parse(coordenadas);
      if (this.poligono) this.map.removeLayer(this.poligono);
      this.poligono = L.polygon(coords.map((c) => [c[0], c[1]] as L.LatLngTuple), {
        color: '#2e7d32', fillOpacity: 0.25, weight: 2,
      }).addTo(this.map);
      this.map.fitBounds(this.poligono.getBounds(), { padding: [40, 40] });
    } catch {
      console.warn('Coordenadas inválidas');
    }
  }
}
