import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { Finca, Lote } from '../../../../core/models/cultivo.model';

@Component({
  selector: 'app-detalle-finca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-finca.html',
  styleUrl: './detalle-finca.css',
})
export class DetalleFincaComponent implements OnInit {
  finca: Finca | null = null;
  lotes: Lote[] = [];
  cargando = true;
  error = '';
  fincaId!: number;
  eliminando = false;
  loteAEliminar: Lote | null = null;
  textoConfirmacion = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fincaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cultivoService.buscarFinca(this.fincaId).subscribe({
      next: (finca) => {
        this.finca = finca;
        this.cargarLotes(this.fincaId);
      },
      error: () => {
        this.error = 'Error al cargar la finca.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarLotes(fincaId: number): void {
    this.cultivoService.listarLotesPorFinca(fincaId).subscribe({
      next: (lotes) => {
        this.lotes = lotes;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los lotes.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'estado-disponible';
      case 'EN_CULTIVO': return 'estado-cultivo';
      case 'EN_DESCANSO': return 'estado-descanso';
      default: return '';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return '🟢 Disponible';
      case 'EN_CULTIVO': return '🟡 En cultivo';
      case 'EN_DESCANSO': return '⚫ En descanso';
      default: return estado;
    }
  }

  entrarLote(id: number): void {
    this.router.navigate(['/cultivo/lote', id]);
  }

  nuevoLote(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId, 'nuevo-lote']);
  }

  iniciarEliminacionLote(event: Event, lote: Lote): void {
    event.stopPropagation();
    this.loteAEliminar = lote;
    this.textoConfirmacion = '';
  }

  cancelarEliminacion(): void {
    this.loteAEliminar = null;
    this.textoConfirmacion = '';
  }

  confirmarEliminacionLote(): void {
    if (this.textoConfirmacion !== 'confirmar' || !this.loteAEliminar) return;

    this.eliminando = true;
    this.cultivoService.eliminarLote(this.loteAEliminar.id!).subscribe({
      next: () => {
        this.lotes = this.lotes.filter(l => l.id !== this.loteAEliminar!.id);
        this.loteAEliminar = null;
        this.textoConfirmacion = '';
        this.eliminando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al eliminar el lote.';
        this.eliminando = false;
        this.cdr.detectChanges();
      },
    });
  }

  volver(): void {
    this.router.navigate(['/cultivo']);
  }
}
