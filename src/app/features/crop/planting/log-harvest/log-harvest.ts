import { UltimoUsadoService } from '../../../../core/services/last-used.service';
import { SiguienteCampoDirective } from '../../../../shared/next-field.directive';
import { Component, OnInit, ChangeDetectorRef, inject, HostListener } from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MigasCultivoComponent } from '../../../../shared/breadcrumbs/crop-breadcrumbs';
import { CultivoService } from '../../../../core/services/crop.service';
import { RestriccionVigente } from '../../../../core/models/crop.model';
import { LanguageService } from '../../../../core/services/language.service';
import { formatoFecha, formatoPesos } from '../../../../shared/format';
import { TrabajadorService } from '../../../../core/services/worker.service';
import { Trabajador } from '../../../../core/models/worker.model';
import { Recolector } from '../../../../core/models/crop.model';

/** Una fila de "¿Quién la recogió?" mientras se llena el formulario */
interface FilaRecolector {
  trabajadorId: number | null;
  modalidad: 'KILO' | 'DIA';
  kilos: number | null;
  valorKilo: number | null;
  valorDia: number | null;
  /** Ya está en una nómina aprobada o pagada: se muestra pero no se cambia */
  fija: boolean;
  nombre?: string;
  estadoNomina?: string | null;
}

@Component({
  selector: 'app-registrar-cosecha',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, MigasCultivoComponent, SiguienteCampoDirective],
  templateUrl: './log-harvest.html',
  styleUrls: ['../../crop-form.css', '../../crop-form-actions.css', './log-harvest.css'],
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
  error = ''; // clave de traducción (o mensaje crudo del backend)
  exito = ''; // clave de traducción

  form: any = {
    fecha: '',
    cantidadKg: null,
    calidad: '',
    observaciones: '',
    siembraId: 0,
    precioKg: null as number | null,
  };

  // ── Quién la recogió ──
  private readonly trabajadorSvc = inject(TrabajadorService);
  /** El equipo activo (con su cargo: por kilo o por día y cuánto) */
  equipo: Trabajador[] = [];
  equipoCargado = false;
  recolectores: FilaRecolector[] = [];
  /** La persona escribió el total a mano: ya no se llena con la suma de los recolectores */
  private kgManual = false;

  calidades = ['PRIMERA', 'SEGUNDA', 'TERCERA'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cultivoService: CultivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  private readonly ultimo = inject(UltimoUsadoService);

  private cargo(id: number | null): Trabajador['cargo'] | undefined {
    return this.equipo.find((t) => t.id === id)?.cargo;
  }

  /** Los del equipo que todavía no están en otra fila */
  disponiblesPara(fila: FilaRecolector | null): Trabajador[] {
    const usados = new Set(this.recolectores.filter((r) => r !== fila).map((r) => r.trabajadorId));
    return this.equipo.filter((t) => !usados.has(t.id ?? null));
  }

  agregarRecolector(): void {
    const fila: FilaRecolector = {
      trabajadorId: null,
      modalidad: 'KILO',
      kilos: null,
      valorKilo: null,
      valorDia: null,
      fija: false,
    };
    const libres = this.disponiblesPara(null);
    this.recolectores = [...this.recolectores, fila];
    // Con una sola persona libre, ya queda elegida
    if (libres.length === 1) this.elegirTrabajador(fila, libres[0].id!);
    this.tocado = true;
  }

  quitarRecolector(fila: FilaRecolector): void {
    this.recolectores = this.recolectores.filter((r) => r !== fila);
    this.sumarKilos();
    this.tocado = true;
  }

  /** Al elegir a alguien, la forma de pago y los valores salen de su cargo (se pueden cambiar) */
  elegirTrabajador(fila: FilaRecolector, id: number | string | null): void {
    fila.trabajadorId = id == null || id === '' ? null : Number(id);
    const c = this.cargo(fila.trabajadorId);
    fila.modalidad = c?.modalidadPago === 'KILO' ? 'KILO' : c ? 'DIA' : 'KILO';
    fila.valorKilo = c?.valorKilo ?? null;
    fila.valorDia = c?.valorJornal || null;
    this.sumarKilos();
  }

  cambiarModalidad(fila: FilaRecolector, m: 'KILO' | 'DIA'): void {
    fila.modalidad = m;
    this.sumarKilos();
    this.tocado = true;
  }

  /** Lo que se le paga a esa persona por esta cosecha */
  valorDe(f: FilaRecolector): number | null {
    if (f.modalidad === 'KILO')
      return f.kilos && f.valorKilo ? Math.round(f.kilos * f.valorKilo) : null;
    return f.valorDia || null;
  }

  /** Los kilos de todos: los pagados por kilo y los que anotaron los de día */
  get kilosRecolectores(): number {
    return this.recolectores.reduce((s, r) => s + (r.kilos ? Number(r.kilos) : 0), 0);
  }

  get manoObra(): number {
    return this.recolectores.reduce((s, r) => s + (this.valorDe(r) ?? 0), 0);
  }

  /** El total de la cosecha es la suma de los kilos de los recolectores, mientras no se escriba a mano */
  sumarKilos(): void {
    if (this.kgManual) return;
    const suma = this.kilosRecolectores;
    if (suma > 0) this.form.cantidadKg = Math.round(suma * 100) / 100;
  }

  alEscribirTotal(): void {
    this.kgManual = true;
  }

  /** El total escrito no coincide con lo que suman los recolectores al kilo */
  get totalDistinto(): boolean {
    const suma = this.kilosRecolectores;
    return suma > 0 && Math.abs(suma - Number(this.form.cantidadKg || 0)) > 0.01;
  }

  usarSuma(): void {
    this.kgManual = false;
    this.sumarKilos();
  }

  /** Falta algo en una fila: quién, los kilos o cuánto se le paga */
  private filaIncompleta(): boolean {
    return this.recolectores.some(
      (r) =>
        !r.fija &&
        (!r.trabajadorId || (r.modalidad === 'KILO' ? !r.kilos || !r.valorKilo : !r.valorDia)),
    );
  }

  private paraEnviar(): Recolector[] {
    return this.recolectores.map((r) => ({
      trabajadorId: r.trabajadorId!,
      modalidad: r.modalidad,
      // Por día los kilos son opcionales (no cambian el pago)
      kilos: r.kilos ? Number(r.kilos) : null,
      valorKilo: r.modalidad === 'KILO' && r.valorKilo ? Number(r.valorKilo) : null,
      valorDia: r.modalidad === 'DIA' && r.valorDia ? Number(r.valorDia) : null,
    }));
  }

  nombreDe(id: number | null): string {
    return this.equipo.find((t) => t.id === id)?.nombreCompleto ?? '';
  }

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

    this.trabajadorSvc.listar().subscribe({
      next: (lista) => {
        this.equipo = (lista ?? [])
          .filter((t) => !t.estado || t.estado === 'ACTIVO')
          .sort((a, b) => (a.nombreCompleto ?? '').localeCompare(b.nombreCompleto ?? ''));
        this.equipoCargado = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.equipoCargado = true;
        this.cdr.detectChanges();
      },
    });

    this.cultivoService.resumenSiembra(this.siembraId).subscribe({
      next: (r) => {
        this.carencia = r?.carencia ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        /* sin aviso de carencia */
      },
    });

    const registro = this.route.snapshot.paramMap.get('registroId');
    if (registro) {
      this.registroId = Number(registro);
      this.cultivoService.buscarCosecha(this.registroId).subscribe({
        next: (c) => {
          this.form = {
            ...this.form,
            fecha: c.fecha,
            cantidadKg: c.cantidadKg,
            calidad: c.calidad,
            observaciones: c.observaciones ?? '',
            precioKg: c.precioKg ?? null,
          };
          this.recolectores = (c.recolectores ?? []).map((r) => ({
            trabajadorId: r.trabajadorId,
            modalidad: r.modalidad,
            kilos: r.kilos ?? null,
            valorKilo: r.valorKilo ?? null,
            valorDia: r.modalidad === 'DIA' ? (r.valor ?? null) : null,
            fija: r.editable === false,
            nombre: r.nombre,
            estadoNomina: r.estadoNomina ?? null,
          }));
          // Al editar, el total es el que se guardó: no se recalcula solo
          this.kgManual = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'temporadas.registro.errors.load';
          this.cdr.detectChanges();
        },
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.exito = '';
    if (this.filaIncompleta()) {
      this.error = 'siembra.harvest.pickers.incomplete';
      return;
    }
    if (this.kilosRecolectores > Number(this.form.cantidadKg || 0) + 0.01) {
      this.error = 'siembra.harvest.pickers.tooMany';
      return;
    }
    this.cargando = true;

    const datos = {
      ...this.form,
      confirmarCarencia: this.confirmarCarencia,
      recolectores: this.paraEnviar(),
    };
    const peticion = this.registroId
      ? this.cultivoService.actualizarCosecha(this.registroId, datos)
      : this.cultivoService.registrarCosecha(datos);
    peticion.subscribe({
      next: (guardado: { id?: number } | null | void) => {
        this.cargando = false;
        this.guardado = true;
        this.exito = this.registroId ? 'temporadas.registro.saved' : 'siembra.harvest.success';
        this.cdr.detectChanges();
        this.avisos.exito(this.registroId ? 'avisos.saved' : 'avisos.harvest');
        // Al volver, la ficha baja hasta el registro y lo marca un momento
        const id = (guardado && guardado.id) || this.registroId;
        this.router.navigate(['/crops/planting', this.siembraId], {
          queryParams: { tab: 'registros', nuevo: id ? 'cosecha-' + id : null },
        });
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
      },
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
}
