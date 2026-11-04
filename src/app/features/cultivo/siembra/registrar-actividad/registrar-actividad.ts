import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';

@Component({
  selector: 'app-registrar-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './registrar-actividad.html',
  styleUrls: ['../../cultivo-form.css', './registrar-actividad.css']
})
export class RegistrarActividad implements OnInit {

  siembraId!: number;
  /** Id de la actividad cuando se está editando */
  registroId: number | null = null;
  cargando = false;
  error = '';   // clave de traducción (o mensaje crudo del backend)
  exito = '';   // clave de traducción

  form: any = {
    tipo: '',
    descripcion: '',
    fecha: '',
    siembraId: 0
  };

  tiposActividad = [
    'PODA', 'TUTOREO', 'DESHIERBE', 'RIEGO', 'REVISION', 'OTRO'
  ];

  tipoIconos: Record<string, string> = {
    PODA:     'ti-scissors',
    TUTOREO:  'ti-line-dashed',
    DESHIERBE:'ti-plant-off',
    RIEGO:    'ti-droplet',
    REVISION: 'ti-zoom-check',
    OTRO:     'ti-dots'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.siembraId = Number(this.route.snapshot.paramMap.get('id'));
    this.form.siembraId = this.siembraId;
    this.form.fecha = new Date().toLocaleDateString('en-CA');

    const registro = this.route.snapshot.paramMap.get('registroId');
    if (registro) {
      this.registroId = Number(registro);
      this.cultivoService.buscarActividad(this.registroId).subscribe({
        next: (a) => {
          this.form = { ...this.form, tipo: a.tipo, descripcion: a.descripcion, fecha: a.fecha };
          this.cdr.detectChanges();
        },
        error: () => { this.error = 'temporadas.registro.errors.load'; this.cdr.detectChanges(); },
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.exito = '';
    this.cargando = true;

    const peticion = this.registroId
      ? this.cultivoService.actualizarActividad(this.registroId, this.form)
      : this.cultivoService.registrarActividad(this.form);
    peticion.subscribe({
      next: () => {
        this.cargando = false;
        this.exito = this.registroId ? 'temporadas.registro.saved' : 'siembra.activity.success';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/cultivo/siembra', this.siembraId]);
        }, 1500);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'siembra.activity.errors.register';
        this.cdr.detectChanges();
      }
    });
  }

  volver(): void {
    this.router.navigate(['/cultivo/siembra', this.siembraId]);
  }
}
