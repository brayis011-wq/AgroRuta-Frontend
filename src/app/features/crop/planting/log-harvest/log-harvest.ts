import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/crop.service';
import { RestriccionVigente } from '../../../../core/models/crop.model';
import { LanguageService } from '../../../../core/services/language.service';
import { formatoFecha, formatoPesos } from '../../../../shared/format';

@Component({
  selector: 'app-registrar-cosecha',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './log-harvest.html',
  styleUrls: ['../../crop-form.css', './log-harvest.css']
})
export class RegistrarCosecha implements OnInit {
  private readonly avisos = inject(AvisosService);

  siembraId!: number;
  /** Id de la cosecha cuando se está editando */
  registroId: number | null = null;
  /** Carencia vigente de la siembra (para avisar antes de registrar) */
  carencia: RestriccionVigente | null = null;
  /** El backend rechazó la fecha por carencia (p. ej. una fecha pasada que el aviso de hoy no cubre) */
  mensajeCarencia = '';
  /** La persona marcó que cosecha de todos modos */
  confirmarCarencia = false;
  private lang = inject(LanguageService);

  pesos(v: number): string {
    return formatoPesos(v, this.lang.current());
  }

  fmtFecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }
  cargando = false;
  error = '';   // clave de traducción (o mensaje crudo del backend)
  exito = '';   // clave de traducción

  form: any = {
    fecha: '',
    cantidadKg: null,
    calidad: '',
    observaciones: '',
    siembraId: 0,
    precioKg: null as number | null,
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
    this.form.fecha = new Date().toLocaleDateString('en-CA');

    this.cultivoService.resumenSiembra(this.siembraId).subscribe({
      next: (r) => { this.carencia = r?.carencia ?? null; this.cdr.detectChanges(); },
      error: () => { /* sin aviso de carencia */ },
    });

    const registro = this.route.snapshot.paramMap.get('registroId');
    if (registro) {
      this.registroId = Number(registro);
      this.cultivoService.buscarCosecha(this.registroId).subscribe({
        next: (c) => {
          this.form = { ...this.form, fecha: c.fecha, cantidadKg: c.cantidadKg, calidad: c.calidad, observaciones: c.observaciones ?? '', precioKg: c.precioKg ?? null };
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

    const datos = { ...this.form, confirmarCarencia: this.confirmarCarencia };
    const peticion = this.registroId
      ? this.cultivoService.actualizarCosecha(this.registroId, datos)
      : this.cultivoService.registrarCosecha(datos);
    peticion.subscribe({
      next: () => {
        this.cargando = false;
        this.exito = this.registroId ? 'temporadas.registro.saved' : 'siembra.harvest.success';
        this.cdr.detectChanges();
        this.avisos.exito(this.registroId ? 'avisos.saved' : 'avisos.harvest');
        this.router.navigate(['/crops/planting', this.siembraId]);
      },
      error: (err) => {
        this.cargando = false;
        // AGR-012: la fecha cae en la carencia de una fumigación; se muestra el aviso con la casilla para confirmar
        if (err.error?.errorCode === 'AGR-012') {
          this.mensajeCarencia = err.error?.message ?? '';
          this.cdr.detectChanges();
          return;
        }
        this.error = err.error?.message || 'siembra.harvest.errors.register';
        this.cdr.detectChanges();
      }
    });
  }

  /** La fecha elegida cae dentro del periodo de carencia de un producto aplicado */
  get enCarencia(): boolean {
    return !!this.carencia && !!this.form.fecha && this.form.fecha < this.carencia.libreDesde;
  }

  /** Hay que confirmar antes de guardar: lo dice el aviso de hoy o lo dijo el backend */
  get pideConfirmacion(): boolean {
    return this.enCarencia || !!this.mensajeCarencia;
  }

  /** Al cambiar la fecha se vuelve a evaluar: la confirmación era para la fecha anterior */
  alCambiarFecha(): void {
    this.mensajeCarencia = '';
    this.confirmarCarencia = false;
  }

  volver(): void {
    this.router.navigate(['/crops/planting', this.siembraId]);
  }
}
