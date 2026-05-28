import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';

@Component({
  selector: 'app-nueva-siembra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-siembra.html',
  styleUrl: './nueva-siembra.css',
})
export class NuevaSiembraComponent implements OnInit {
  form = {
    fechaSiembra: '',
    cantidadPlantas: null as number | null,
    variedad: '',
  };

  loteId!: number;
  fincaId!: number;
  guardando = false;
  error = '';
  exito = false;

  constructor(
    private cultivoService: CultivoService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // URL esperada: /cultivo/finca/:fincaId/lote/:loteId/nueva-siembra
    this.fincaId = Number(this.route.snapshot.paramMap.get('fincaId'));
    this.loteId = Number(this.route.snapshot.paramMap.get('loteId'));
  }

  registrar(): void {
    if (!this.form.fechaSiembra || !this.form.cantidadPlantas || !this.form.variedad) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.cultivoService.registrarSiembra({
      fechaSiembra: this.form.fechaSiembra,
      cantidadPlantas: this.form.cantidadPlantas,
      variedad: this.form.variedad as 'COLOMBIA' | 'GIGANTE' | 'KENYA',
      loteId: this.loteId,
    }).subscribe({
      next: () => {
        this.exito = true;
        this.guardando = false;
        setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1500);
      },
      error: () => {
        this.error = 'Error al registrar la siembra. Intenta de nuevo.';
        this.guardando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId]);
  }
}
