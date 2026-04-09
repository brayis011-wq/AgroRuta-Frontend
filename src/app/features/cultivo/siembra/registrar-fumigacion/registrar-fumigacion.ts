import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';

@Component({
  selector: 'app-registrar-fumigacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-fumigacion.html',
  styleUrl: './registrar-fumigacion.css'
})
export class RegistrarFumigacion implements OnInit {

  siembraId!: number;
  cargando = false;
  error = '';
  exito = '';

  form: any = {
    fecha: '',
    producto: '',
    dosis: null,
    unidadMedida: '',
    areaAplicada: null,
    observaciones: '',
    siembraId: 0
  };

  unidades = ['LITROS', 'ML', 'GRAMOS', 'KG'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.siembraId = Number(this.route.snapshot.paramMap.get('id'));
    this.form.siembraId = this.siembraId;
    this.form.fecha = new Date().toISOString().split('T')[0];
  }

  onSubmit(): void {
    this.error = '';
    this.exito = '';
    this.cargando = true;

    this.cultivoService.registrarFumigacion(this.form).subscribe({
      next: () => {
        this.cargando = false;
        this.exito = '¡Fumigación registrada exitosamente!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/cultivo/siembra', this.siembraId]);
        }, 1500);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al registrar la fumigación.';
        this.cdr.detectChanges();
      }
    });
  }

  volver(): void {
    this.router.navigate(['/cultivo/siembra', this.siembraId]);
  }
}
