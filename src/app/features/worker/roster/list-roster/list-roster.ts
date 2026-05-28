// src/app/features/worker/roster/list-roster/list-roster.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NominaService,
  TrabajadorService,
  PagoService,
  NominaRequest,
  PagoRequest
} from '../../../../core/services/worker.service';
import { Nomina, Trabajador } from '../../../../core/models/worker.model';

@Component({
  selector: 'app-lista-nominas',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './list-roster.html',
  styleUrls: ['./list-roster.css']
})
export class ListaNominasComponent implements OnInit {
  todasLasNominas: Nomina[] = [];
  nominas: Nomina[] = [];
  trabajadores: Trabajador[] = [];
  trabajadorFiltrado: Trabajador | null = null;
  form!: FormGroup;
  mostrarForm = false;
  guardando = false;
  aprobando: number | null = null;
  error = '';
  exito = '';

  constructor(
    private fb: FormBuilder,
    private nominaService: NominaService,
    private trabajadorService: TrabajadorService,
    private pagoService: PagoService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      trabajadorId:  [null, Validators.required],
      periodoInicio: ['',   Validators.required],
      periodoFin:    ['',   Validators.required]
    });

    this.trabajadorService.listar().subscribe({
      next: (t: Trabajador[]) => {
        this.trabajadores = [...t];
        const idParam = this.route.snapshot.queryParamMap.get('trabajadorId');
        if (idParam) {
          const id = Number(idParam);
          this.trabajadorFiltrado = t.find(w => w.id === id) ?? null;
          this.form.patchValue({ trabajadorId: id });
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.cargar();
  }

  cargar(): void {
    this.nominaService.listarTodas().subscribe({
      next: (n: Nomina[]) => {
        this.todasLasNominas = n.map(nomina => ({
          ...nomina,
          trabajadorId: nomina.trabajador?.id ?? nomina.trabajadorId ?? 0
        }));
        this.aplicarFiltro();
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Error al cargar nóminas'; this.cdr.detectChanges(); }
    });
  }

  aplicarFiltro(): void {
    if (this.trabajadorFiltrado) {
      this.nominas = this.todasLasNominas.filter(n =>
        n.trabajador?.id === this.trabajadorFiltrado!.id ||
        n.trabajadorId   === this.trabajadorFiltrado!.id
      );
    } else {
      this.nominas = this.todasLasNominas;
    }
  }

  /**
   * Permite generar nómina si:
   * - No hay filtro de trabajador (vista global), O
   * - El trabajador filtrado no tiene ninguna nómina en PENDIENTE o PAGADA
   */
  get puedeGenerarNomina(): boolean {
    if (!this.trabajadorFiltrado) return true;
    return !this.nominas.some(n =>
      n.estado === 'PENDIENTE' || n.estado === 'PAGADA'
    );
  }

  verTodas(): void {
    this.trabajadorFiltrado = null;
    this.form.patchValue({ trabajadorId: null });
    this.aplicarFiltro();
    this.cdr.detectChanges();
  }

  generar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const val = this.form.value;
    const req: NominaRequest = {
      trabajadorId:  Number(val.trabajadorId),
      periodoInicio: val.periodoInicio,
      periodoFin:    val.periodoFin
    };
    this.nominaService.generar(req).subscribe({
      next: () => { this.cargar(); this.mostrarForm = false; this.guardando = false; },
      error: () => { this.error = 'Error al generar nómina'; this.guardando = false; this.cdr.detectChanges(); }
    });
  }

  aprobar(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('¿Aprobar esta nómina? Se registrará el pago automáticamente en efectivo.')) return;

    this.aprobando = id;
    this.error = '';
    this.exito = '';

    this.nominaService.aprobar(id).subscribe({
      next: (nominaAprobada: Nomina) => {
        const pagoReq: PagoRequest = {
          nominaId:   nominaAprobada.id!,
          monto:      nominaAprobada.valorTotal,
          metodoPago: 'EFECTIVO'
        };
        this.pagoService.registrar(pagoReq).subscribe({
          next: () => {
            this.aprobando = null;
            this.exito = `✅ Nómina aprobada y pago de $${nominaAprobada.valorTotal.toLocaleString()} registrado`;
            this.cargar();
            this.cdr.detectChanges();
            setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 4000);
          },
          error: () => {
            this.aprobando = null;
            this.error = '⚠️ Nómina aprobada pero ocurrió un error al registrar el pago.';
            this.cargar();
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.error = 'Error al aprobar la nómina';
        this.aprobando = null;
        this.cdr.detectChanges();
      }
    });
  }

  anular(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('¿Anular esta nómina?')) return;
    this.nominaService.anular(id).subscribe({
      next: () => { this.cargar(); },
      error: () => { this.error = 'Error al anular nómina'; this.cdr.detectChanges(); }
    });
  }

  reactivar(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('¿Reactivar esta nómina? Volverá a estado PENDIENTE.')) return;
    this.nominaService.reactivar(id).subscribe({
      next: () => {
        this.exito = '✅ Nómina reactivada como PENDIENTE';
        this.cargar();
        this.cdr.detectChanges();
        setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 3500);
      },
      error: () => { this.error = 'Error al reactivar nómina'; this.cdr.detectChanges(); }
    });
  }

  eliminar(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('¿Eliminar esta nómina definitivamente? Esta acción no se puede deshacer.')) return;
    this.nominaService.eliminar(id).subscribe({
      next: () => {
        this.todasLasNominas = this.todasLasNominas.filter(n => n.id !== id);
        this.aplicarFiltro();
        this.exito = '🗑 Nómina eliminada';
        this.cdr.detectChanges();
        setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 3500);
      },
      error: () => { this.error = 'Error al eliminar nómina'; this.cdr.detectChanges(); }
    });
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'badge-borrador',
      APROBADA: 'badge-activo',
      PAGADA:   'badge-pagada',
      ANULADA:  'badge-inactivo'
    };
    return mapa[estado] ?? '';
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}
