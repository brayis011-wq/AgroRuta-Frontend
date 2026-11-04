import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { CatalogoCultivoService } from '../../../../core/services/catalogo-cultivo.service';
import { Siembra, TipoCultivo } from '../../../../core/models/cultivo.model';
import { forkJoin, of, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-nueva-siembra',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './nueva-siembra.html',
  styleUrl: './nueva-siembra.css',
})
export class NuevaSiembraComponent implements OnInit {
  form = {
    fechaSiembra: '',
    cantidadPlantas: null as number | null,
    tipoCultivoId: null as number | null,
    variedadId: null as number | null,
  };

  /** Catálogo de cultivos activos con sus variedades */
  cultivos: TipoCultivo[] = [];
  cargandoCatalogo = true;

  loteId!: number;
  fincaId!: number;
  /** Id de la siembra cuando se está editando (ruta /cultivo/siembra/:id/editar) */
  siembraId: number | null = null;
  guardando = false;
  error = '';        // clave de traducción
  exito = false;

  constructor(
    private cultivoService: CultivoService,
    private catalogo: CatalogoCultivoService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Nueva:  /cultivo/finca/:fincaId/lote/:loteId/nueva-siembra
    // Editar: /cultivo/siembra/:id/editar
    const params = this.route.snapshot.paramMap;
    this.fincaId = Number(params.get('fincaId'));
    this.loteId = Number(params.get('loteId'));
    if (!params.get('loteId') && params.get('id')) this.siembraId = Number(params.get('id'));

    const siembra$ = this.siembraId
      ? this.cultivoService.buscarSiembra(this.siembraId).pipe(
          switchMap((s) => this.cultivoService.buscarLote(s.loteId).pipe(map((l) => ({ s, fincaId: l.fincaId })))))
      : of(null);

    forkJoin({ catalogo: this.catalogo.activos(), actual: siembra$ }).subscribe({
      next: ({ catalogo, actual }) => {
        this.cultivos = catalogo.filter((t) => t.variedades.length > 0);
        this.cargandoCatalogo = false;
        if (actual) this.llenarConSiembra(actual.s, actual.fincaId);
        else if (this.cultivos.length === 1) this.elegirCultivo(this.cultivos[0].id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoCatalogo = false;
        this.error = 'siembra.new.errors.loadCatalog';
        this.cdr.detectChanges();
      },
    });
  }

  /** Variedades del cultivo elegido */
  get variedades() {
    return this.cultivos.find((c) => c.id === this.form.tipoCultivoId)?.variedades ?? [];
  }

  elegirCultivo(id: number | null): void {
    this.form.tipoCultivoId = id;
    const vs = this.variedades;
    this.form.variedadId = vs.length === 1 ? vs[0].id : null;
  }

  readonly hoy = new Date().toLocaleDateString('en-CA');

  /** Modo edición: la variedad actual se muestra aunque ya esté desactivada en el catálogo */
  private llenarConSiembra(s: Siembra, fincaId: number): void {
    this.loteId = s.loteId;
    this.fincaId = fincaId;
    let cultivo = this.cultivos.find((c) => c.variedades.some((v) => v.id === s.variedadId));
    if (!cultivo && s.variedadId) {
      cultivo = {
        id: -1, nombre: s.tipoCultivo || s.variedad, activo: false,
        variedades: [{ id: s.variedadId, nombre: s.variedad, activo: false, tipoCultivoId: -1, tipoCultivoNombre: s.tipoCultivo ?? '' }],
      };
      this.cultivos = [cultivo, ...this.cultivos];
    }
    this.form = {
      fechaSiembra: s.fechaSiembra,
      cantidadPlantas: s.cantidadPlantas,
      tipoCultivoId: cultivo?.id ?? null,
      variedadId: s.variedadId ?? null,
    };
  }

  registrar(): void {
    if (!this.form.fechaSiembra || !this.form.cantidadPlantas || !this.form.variedadId) {
      this.error = 'siembra.new.errors.required';
      return;
    }

    this.guardando = true;
    this.error = '';

    const datos = {
      fechaSiembra: this.form.fechaSiembra,
      cantidadPlantas: this.form.cantidadPlantas,
      variedadId: this.form.variedadId,
      loteId: this.loteId,
    };
    const peticion = this.siembraId
      ? this.cultivoService.actualizarSiembra(this.siembraId, datos)
      : this.cultivoService.registrarSiembra(datos);
    peticion.subscribe({
      next: (s) => {
        this.exito = true;
        this.guardando = false;
        this.cdr.detectChanges();
        // al lote, donde se ve el ciclo de la nueva temporada; al editar, de vuelta a la siembra
        const destino = this.siembraId ? ['/cultivo/siembra', this.siembraId] : ['/cultivo/lote', s?.loteId ?? this.loteId];
        setTimeout(() => this.router.navigate(destino), 1200);
      },
      error: (err) => {
        // El backend explica el motivo (lote ocupado, variedad desactivada...)
        this.error = err?.error?.message || 'siembra.new.errors.register';
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    if (this.siembraId) this.router.navigate(['/cultivo/siembra', this.siembraId]);
    else this.router.navigate(['/cultivo/lote', this.loteId]);
  }
}
