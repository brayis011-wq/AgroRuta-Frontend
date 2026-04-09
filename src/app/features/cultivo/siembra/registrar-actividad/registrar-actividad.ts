import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';

@Component({
  selector: 'app-registrar-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-actividad.html',
  styleUrl: './registrar-actividad.css'
})
export class RegistrarActividad implements OnInit {

  siembraId!: number;
  cargando = false;
  error = '';
  exito = '';

  form: any = {
    tipo: '',
    descripcion: '',
    fecha: '',
    siembraId: 0
  };

  tiposActividad = [
    'PODA', 'TUTOREO', 'DESHIERBE', 'RIEGO', 'REVISION', 'OTRO'
  ];

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

    this.cultivoService.registrarActividad(this.form).subscribe({
      next: () => {
        this.cargando = false;
        this.exito = '¡Actividad registrada exitosamente!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/cultivo/siembra', this.siembraId]);
        }, 1500);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al registrar la actividad.';
        this.cdr.detectChanges();
      }
    });
  }

  volver(): void {
    this.router.navigate(['/cultivo/siembra', this.siembraId]);
  }
}
