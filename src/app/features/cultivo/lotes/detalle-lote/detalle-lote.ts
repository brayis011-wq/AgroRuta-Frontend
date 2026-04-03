import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { Lote, Siembra } from '../../../../core/models/cultivo.model';

@Component({
  selector: 'app-detalle-lote',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-lote.html',
  styleUrl: './detalle-lote.css',
})
export class DetalleLoteComponent implements OnInit {
  lote: Lote | null = null;
  siembra: Siembra | null = null;
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
    this.cultivoService.buscarLote(id).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.cargarSiembra(id);
      },
      error: () => {
        this.error = 'Error al cargar el lote.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarSiembra(loteId: number): void {
    this.cultivoService.buscarSiembraPorLote(loteId).subscribe({
      next: (siembra) => {
        this.siembra = siembra;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.siembra = null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  getEtapaIndex(): number {
    const etapas = ['GERMINACION', 'CRECIMIENTO', 'PRODUCCION', 'COSECHA', 'FINALIZADO'];
    return etapas.indexOf(this.siembra?.estadoCultivo || '');
  }

  getDiasTranscurridos(): number {
    if (!this.siembra?.fechaSiembra) return 0;
    const inicio = new Date(this.siembra.fechaSiembra);
    const hoy = new Date();
    return Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  entrarSiembra(): void {
    this.router.navigate(['/cultivo/siembra', this.siembra!.id]);
  }

  nuevaSiembra(): void {
    this.router.navigate(['/cultivo/siembra/nueva', this.lote!.id]);
  }

  volver(): void {
    this.router.navigate(['/cultivo/finca', this.lote?.fincaId]);
  }
}
