import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { CatalogoCultivoService } from '../../../../core/services/catalogo-cultivo.service';
import { TipoCultivo } from '../../../../core/models/cultivo.model';

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
    // URL esperada: /cultivo/finca/:fincaId/lote/:loteId/nueva-siembra
    this.fincaId = Number(this.route.snapshot.paramMap.get('fincaId'));
    this.loteId = Number(this.route.snapshot.paramMap.get('loteId'));

    this.catalogo.activos().subscribe({
      next: (c) => {
        this.cultivos = c.filter((t) => t.variedades.length > 0);
        this.cargandoCatalogo = false;
        if (this.cultivos.length === 1) this.elegirCultivo(this.cultivos[0].id);
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

  registrar(): void {
    if (!this.form.fechaSiembra || !this.form.cantidadPlantas || !this.form.variedadId) {
      this.error = 'siembra.new.errors.required';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.cultivoService.registrarSiembra({
      fechaSiembra: this.form.fechaSiembra,
      cantidadPlantas: this.form.cantidadPlantas,
      variedadId: this.form.variedadId,
      loteId: this.loteId,
    }).subscribe({
      next: () => {
        this.exito = true;
        this.guardando = false;
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1500);
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
    this.router.navigate(['/cultivo/finca', this.fincaId]);
  }
}
