import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { Finca, Lote } from '../../../../core/models/cultivo.model';

@Component({
  selector: 'app-detalle-finca',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-finca.html',
  styleUrl: './detalle-finca.css',
})
export class DetalleFincaComponent implements OnInit {
  finca: Finca | null = null;
  lotes: Lote[] = [];
  cargando = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cultivoService.buscarFinca(id).subscribe({
      next: (finca) => {
        this.finca = finca;
        this.cargarLotes(id);
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
      case 'DISPONIBLE':
        return 'estado-disponible';
      case 'EN_CULTIVO':
        return 'estado-cultivo';
      case 'EN_DESCANSO':
        return 'estado-descanso';
      default:
        return '';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return '🟢 Disponible';
      case 'EN_CULTIVO':
        return '🟡 En cultivo';
      case 'EN_DESCANSO':
        return '⚫ En descanso';
      default:
        return estado;
    }
  }

  entrarLote(id: number): void {
    this.router.navigate(['/cultivo/lote', id]);
  }

  volver(): void {
    this.router.navigate(['/cultivo']);
  }
}
