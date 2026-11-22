import { UltimoUsadoService } from '../../../../core/services/last-used.service';
import { SiguienteCampoDirective } from '../../../../shared/next-field.directive';
import { Component, OnInit, ChangeDetectorRef, inject, HostListener } from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MigasCultivoComponent } from '../../../../shared/breadcrumbs/crop-breadcrumbs';
import { CultivoService } from '../../../../core/services/crop.service';

@Component({
  selector: 'app-registrar-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, MigasCultivoComponent, SiguienteCampoDirective],
  templateUrl: './log-activity.html',
  styleUrls: ['../../crop-form.css', '../../crop-form-actions.css', './log-activity.css']
})
export class RegistrarActividad implements OnInit {
  private readonly avisos = inject(AvisosService);

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
    siembraId: 0,
    costo: null as number | null,
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

  private readonly ultimo = inject(UltimoUsadoService);

  // ── Cambios sin guardar: cuenta solo lo que escribe o elige la persona (no lo que la app rellena sola) ──
  private tocado = false;
  private guardado = false;

  @HostListener('input')
  @HostListener('change')
  alEditar(): void {
    this.tocado = true;
  }

  tieneCambios(): boolean {
    return this.tocado && !this.guardado;
  }

  ngOnInit(): void {
    this.siembraId = Number(this.route.snapshot.paramMap.get('id'));
    this.form.siembraId = this.siembraId;
    this.form.fecha = new Date().toLocaleDateString('en-CA');
    // Desde el calendario se puede programar para otro día: ?fecha=2026-11-12
    const fechaQuery = this.route.snapshot.queryParamMap?.get('fecha');
    if (fechaQuery && /^\d{4}-\d{2}-\d{2}$/.test(fechaQuery)) this.form.fecha = fechaQuery;

    const registro = this.route.snapshot.paramMap.get('registroId');
    // Una actividad nueva empieza con el tipo de la anterior (en temporada se repite la misma labor)
    if (!registro) this.form.tipo = this.ultimo.leer<{ tipo?: string }>('actividad')?.tipo ?? this.form.tipo;
    // Desde una labor que se repite: ?tipo=DESHIERBE
    const tipoQuery = this.route.snapshot.queryParamMap?.get('tipo');
    if (!registro && tipoQuery && /^[A-Z]+$/.test(tipoQuery)) this.form.tipo = tipoQuery;
    if (registro) {
      this.registroId = Number(registro);
      this.cultivoService.buscarActividad(this.registroId).subscribe({
        next: (a) => {
          this.form = { ...this.form, tipo: a.tipo, descripcion: a.descripcion, fecha: a.fecha, costo: a.costo ?? null };
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
      next: (guardado: { id?: number } | null | void) => {
        this.cargando = false;
        this.guardado = true;
        if (this.form.tipo) this.ultimo.guardar('actividad', { tipo: this.form.tipo });
        this.exito = this.registroId ? 'temporadas.registro.saved' : 'siembra.activity.success';
        this.cdr.detectChanges();
        this.avisos.exito(this.registroId ? 'avisos.saved' : 'avisos.activity');
        // Al volver, la ficha baja hasta el registro y lo marca un momento
        const id = (guardado && guardado.id) || this.registroId;
        this.router.navigate(['/crops/planting', this.siembraId], { queryParams: { tab: 'registros', nuevo: id ? 'actividad-' + id : null } });
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'siembra.activity.errors.register';
        this.cdr.detectChanges();
      }
    });
  }

}
