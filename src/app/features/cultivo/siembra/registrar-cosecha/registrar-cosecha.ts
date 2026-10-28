import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';

@Component({
  selector: 'app-registrar-cosecha',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './registrar-cosecha.html',
  styleUrl: './registrar-cosecha.css'
})
export class RegistrarCosecha implements OnInit {

  siembraId!: number;
  cargando = false;
  error = '';   // clave de traducción (o mensaje crudo del backend)
  exito = '';   // clave de traducción

  form: any = {
    fecha: '',
    cantidadKg: null,
    calidad: '',
    observaciones: '',
    siembraId: 0
  };

  calidades = ['PRIMERA', 'SEGUNDA', 'TERCERA'];

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

    this.cultivoService.registrarCosecha(this.form).subscribe({
      next: () => {
        this.cargando = false;
        this.exito = 'siembra.harvest.success';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/cultivo/siembra', this.siembraId]);
        }, 1500);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'siembra.harvest.errors.register';
        this.cdr.detectChanges();
      }
    });
  }

  volver(): void {
    this.router.navigate(['/cultivo/siembra', this.siembraId]);
  }
}
