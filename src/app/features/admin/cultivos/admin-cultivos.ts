import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CatalogoCultivoService } from '../../../core/services/catalogo-cultivo.service';
import { TipoCultivo, VariedadCultivo } from '../../../core/models/cultivo.model';

/**
 * Catálogo de cultivos y variedades que los agricultores eligen al sembrar.
 * No se borra nada: se desactiva, así las siembras ya registradas conservan su cultivo.
 */
@Component({
  selector: 'app-admin-cultivos',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './admin-cultivos.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css', './admin-cultivos.css'],
})
export class AdminCultivosComponent implements OnInit {
  private readonly catalogo = inject(CatalogoCultivoService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  cultivos: TipoCultivo[] = [];
  cargando = true;
  error = false;
  guardando = false;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  nuevoCultivo = '';
  /** Texto de "nueva variedad" por cultivo */
  nuevaVariedad: Record<number, string> = {};

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.catalogo.todos().subscribe({
      next: (c) => { this.cultivos = c; this.cargando = false; this.cdr.markForCheck(); },
      error: () => { this.error = true; this.cargando = false; this.cdr.markForCheck(); },
    });
  }

  activas(t: TipoCultivo): number {
    return t.variedades.filter((v) => v.activo).length;
  }

  crearCultivo(): void {
    const nombre = this.nuevoCultivo.trim();
    if (!nombre || this.guardando) return;
    this.ejecutar(this.catalogo.crearTipo(nombre), 'admin.crops.created', { name: nombre }, () => (this.nuevoCultivo = ''));
  }

  crearVariedad(t: TipoCultivo): void {
    const nombre = (this.nuevaVariedad[t.id] ?? '').trim();
    if (!nombre || this.guardando) return;
    this.ejecutar(this.catalogo.crearVariedad(t.id, nombre), 'admin.crops.varietyCreated',
      { name: nombre, crop: t.nombre }, () => (this.nuevaVariedad[t.id] = ''));
  }

  alternarCultivo(t: TipoCultivo): void {
    this.ejecutar(this.catalogo.estadoTipo(t.id, !t.activo),
      t.activo ? 'admin.crops.deactivated' : 'admin.crops.activated', { name: t.nombre });
  }

  alternarVariedad(v: VariedadCultivo): void {
    this.ejecutar(this.catalogo.estadoVariedad(v.id, !v.activo),
      v.activo ? 'admin.crops.deactivated' : 'admin.crops.activated', { name: v.nombre });
  }

  private ejecutar(obs: import('rxjs').Observable<unknown>, clave: string, params: object, alTerminar?: () => void): void {
    this.guardando = true;
    this.mensaje = null;
    obs.subscribe({
      next: () => {
        this.guardando = false;
        alTerminar?.();
        this.mensaje = { tipo: 'ok', texto: this.translate.instant(clave, params) };
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        this.mensaje = { tipo: 'error', texto: err?.error?.message || this.translate.instant('admin.crops.saveError') };
        this.cdr.markForCheck();
      },
    });
  }
}
