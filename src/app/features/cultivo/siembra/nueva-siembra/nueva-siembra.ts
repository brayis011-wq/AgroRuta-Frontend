import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';

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
    variedad: '',
  };

  loteId!: number;
  fincaId!: number;
  guardando = false;
  error = '';        // clave de traducción
  exito = false;

  constructor(
    private cultivoService: CultivoService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // URL esperada: /cultivo/finca/:fincaId/lote/:loteId/nueva-siembra
    this.fincaId = Number(this.route.snapshot.paramMap.get('fincaId'));
    this.loteId = Number(this.route.snapshot.paramMap.get('loteId'));
  }

  registrar(): void {
    if (!this.form.fechaSiembra || !this.form.cantidadPlantas || !this.form.variedad) {
      this.error = 'siembra.new.errors.required';
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
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/cultivo/finca', this.fincaId]), 1500);
      },
      error: () => {
        this.error = 'siembra.new.errors.register';
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId]);
  }
}
