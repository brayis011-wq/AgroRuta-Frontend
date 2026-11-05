import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { RestriccionVigente } from '../../../../core/models/cultivo.model';
import { LanguageService } from '../../../../core/services/language.service';
import { formatoFecha } from '../../../../shared/formato';

@Component({
  selector: 'app-registrar-cosecha',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './registrar-cosecha.html',
  styleUrls: ['../../cultivo-form.css', './registrar-cosecha.css']
})
export class RegistrarCosecha implements OnInit {

  siembraId!: number;
  /** Id de la cosecha cuando se está editando */
  registroId: number | null = null;
  /** Carencia vigente de la siembra (para avisar antes de registrar) */
  carencia: RestriccionVigente | null = null;
  private lang = inject(LanguageService);

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
          this.form = { ...this.form, fecha: c.fecha, cantidadKg: c.cantidadKg, calidad: c.calidad, observaciones: c.observaciones ?? '' };
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
      ? this.cultivoService.actualizarCosecha(this.registroId, this.form)
      : this.cultivoService.registrarCosecha(this.form);
    peticion.subscribe({
      next: () => {
        this.cargando = false;
        this.exito = this.registroId ? 'temporadas.registro.saved' : 'siembra.harvest.success';
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

  /** La fecha elegida cae dentro del periodo de carencia de un producto aplicado */
  get enCarencia(): boolean {
    return !!this.carencia && !!this.form.fecha && this.form.fecha < this.carencia.libreDesde;
  }

  volver(): void {
    this.router.navigate(['/cultivo/siembra', this.siembraId]);
  }
}
