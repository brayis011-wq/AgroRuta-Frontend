import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';

@Component({
  selector: 'app-nuevo-lote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nuevo-lote.html',
  styleUrl: './nuevo-lote.css',
})
export class NuevoLoteComponent implements OnInit {
  form = {
    nombre: '',
    area: null as number | null,
  };

  fincaId!: number;
  hectareasFinca: number | null = null;
  guardando = false;
  error = '';
  exito = false;

  constructor(
    private cultivoService: CultivoService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.fincaId = Number(this.route.snapshot.paramMap.get('fincaId'));
    this.cultivoService.buscarFinca(this.fincaId).subscribe({
      next: (finca) => this.hectareasFinca = finca.hectareas,
      error: () => this.error = 'No se pudo cargar la información de la finca.',
    });
  }

  registrar(): void {
    if (!this.form.nombre || !this.form.area) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }

    if (this.hectareasFinca !== null && this.form.area > this.hectareasFinca) {
      this.error = `El área del lote no puede superar las ${this.hectareasFinca} ha de la finca.`;
      return;
    }

    this.guardando = true;
    this.error = '';

    this.cultivoService.registrarLote({
      nombre: this.form.nombre,
      area: this.form.area,
      fincaId: this.fincaId,
    }).subscribe({
      next: () => {
        this.exito = true;
        this.router.navigate(['/cultivo/finca', this.fincaId]);
      },
      error: () => {
        this.error = 'Error al registrar el lote. Intenta de nuevo.';
        this.guardando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo/finca', this.fincaId]);
  }
}
