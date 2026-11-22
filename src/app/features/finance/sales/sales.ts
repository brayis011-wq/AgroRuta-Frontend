import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, forkJoin, of, switchMap } from 'rxjs';
import { PreciosService, VentasService } from '../../../core/services/finance.service';
import { PrecioCultivo } from '../../../core/models/finance.model';
import { CultivoDisponible, JornalService } from '../../../core/services/worker.service';
import { EstadoVenta, MetodoCobro, ResumenVentas, Venta, VentaRequest } from '../../../core/models/finance.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { AvisosService } from '../../../core/services/toast.service';
import { FechaPipe, PesosPipe } from '../../../shared/format.pipe';

type Filtro = 'debe' | 'VENCIDA' | 'PAGADA' | 'todas';

interface FormVenta {
  id: number | null;
  comprador: string;
  producto: string;
  siembraId: number | null;
  fecha: string;
  cantidadKg: number | null;
  precioKg: number | null;
  total: number | null;
  credito: boolean;
  vence: string;
  metodo: MetodoCobro;
  observaciones: string;
}

const hoyIso = () => new Date().toLocaleDateString('en-CA');

/** Ventas y cuentas por cobrar: a quién le vendiste, cuánto y cuánto te debe todavía */
@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [FormsModule, TranslatePipe, PesosPipe, FechaPipe],
  templateUrl: './sales.html',
  styleUrls: ['../../crop/crop-ui.css', '../../crop/crop-blocks.css', '../../report/report-table.css', '../../worker/worker-ui.css',
    '../../worker/worker-panel.css', '../../../shared/styles/opciones.css', '../finance.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasComponent implements OnInit {
  private readonly ventas = inject(VentasService);
  private readonly jornales = inject(JornalService);
  private readonly confirm = inject(ConfirmService);
  private readonly avisos = inject(AvisosService);
  private readonly translate = inject(TranslateService);

  readonly lista = signal<Venta[] | null>(null);
  readonly resumen = signal<ResumenVentas | null>(null);
  readonly compradores = signal<string[]>([]);
  readonly cultivos = signal<CultivoDisponible[]>([]);
  readonly filtro = signal<Filtro>('debe');
  readonly comprador = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly form = signal<FormVenta | null>(null);
  readonly cobrando = signal<Venta | null>(null);
  readonly guardando = signal(false);
  readonly errorPanel = signal<string | null>(null);
  abono = { fecha: hoyIso(), monto: null as number | null, metodo: 'EFECTIVO' as MetodoCobro, observaciones: '' };
  readonly metodos: MetodoCobro[] = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'];
  readonly hoy = hoyIso();

  readonly visibles = computed(() => {
    const f = this.filtro(), quien = this.comprador()?.toLowerCase() ?? null;
    return (this.lista() ?? []).filter((v) =>
      (f === 'todas' || (f === 'debe' ? v.estado !== 'PAGADA' : v.estado === f))
      && (!quien || v.comprador.toLowerCase() === quien));
  });

  ngOnInit(): void {
    this.cargar();
    this.jornales.cultivosDisponibles().subscribe({ next: (c) => this.cultivos.set(c), error: () => {} });
  }

  cargar(): void {
    forkJoin({ lista: this.ventas.listar(), resumen: this.ventas.resumen(), compradores: this.ventas.compradores() }).subscribe({
      next: ({ lista, resumen, compradores }) => {
        this.lista.set(lista);
        this.resumen.set(resumen);
        this.compradores.set(compradores);
        this.error.set(null);
        const abierta = this.cobrando();
        if (abierta) this.cobrando.set(lista.find((v) => v.id === abierta.id) ?? null);
      },
      error: () => { this.lista.set([]); this.error.set('ventas.errors.load'); },
    });
  }

  verComprador(nombre: string | null): void {
    this.comprador.set(this.comprador() === nombre ? null : nombre);
    if (nombre) this.filtro.set('debe');
  }

  // ── Venta ──

  // ── Precio de referencia del cultivo (SIPSA o el propio) para sugerir el precio por kilo ──

  private readonly precios = inject(PreciosService);
  readonly referencia = signal<PrecioCultivo | null>(null);
  private readonly pedirReferencia = new Subject<{ cultivo: string; variedad: string | null }>();
  private readonly suscripcionReferencia = this.pedirReferencia.pipe(
    debounceTime(350),
    switchMap((q) => (q.cultivo ? this.precios.deCultivo(q.cultivo, q.variedad).pipe(catchError(() => of(null))) : of(null))),
    takeUntilDestroyed(),
  ).subscribe((p) => this.referencia.set(p?.precioKg ? p : null));

  /**
   * De qué cultivo es la venta: el de la siembra elegida o, si no hay, el producto escrito
   * ("Mora de Castilla" → cultivo Mora, variedad "de Castilla").
   */
  private buscarReferencia(f: FormVenta): void {
    const c = f.siembraId != null ? this.cultivos().find((x) => x.id === f.siembraId) : null;
    if (c?.tipoCultivo) { this.pedirReferencia.next({ cultivo: c.tipoCultivo, variedad: c.variedad }); return; }
    const palabras = f.producto.trim().split(' ').filter(Boolean);
    this.pedirReferencia.next({ cultivo: palabras[0] ?? '', variedad: palabras.slice(1).join(' ') || null });
  }

  /** Lo que se ve en gris en el campo vacío: el precio de referencia redondeado */
  ejemploPrecio(): string {
    const p = this.referencia()?.precioKg;
    return p ? String(Math.round(p)) : '0';
  }

  usarReferencia(): void {
    const p = this.referencia();
    if (p?.precioKg) this.campo('precioKg', Math.round(p.precioKg));
  }

  nueva(): void {
    this.errorPanel.set(null);
    this.referencia.set(null);
    this.form.set({ id: null, comprador: this.comprador() ?? '', producto: '', siembraId: null, fecha: this.hoy, cantidadKg: null,
      precioKg: null, total: null, credito: true, vence: '', metodo: 'EFECTIVO', observaciones: '' });
  }

  editar(v: Venta): void {
    this.errorPanel.set(null);
    this.form.set({ id: v.id, comprador: v.comprador, producto: v.producto, siembraId: v.siembraId, fecha: v.fecha,
      cantidadKg: v.cantidadKg, precioKg: v.precioKg, total: v.total, credito: true, vence: v.vence ?? '',
      metodo: 'EFECTIVO', observaciones: v.observaciones ?? '' });
    this.referencia.set(null);
    this.buscarReferencia(this.form()!);
  }

  campo<K extends keyof FormVenta>(k: K, valor: FormVenta[K]): void {
    const f = this.form();
    if (!f) return;
    const nuevo = { ...f, [k]: valor };
    // Al elegir la siembra, el producto se llena con el cultivo (si está vacío)
    if (k === 'siembraId' && !f.producto) {
      const c = this.cultivos().find((x) => x.id === valor);
      if (c?.tipoCultivo) nuevo.producto = c.tipoCultivo + (c.variedad ? ' ' + c.variedad : '');
    }
    this.form.set(nuevo);
    if (k === 'siembraId' || k === 'producto') this.buscarReferencia(nuevo);
  }

  /** Kilos × precio cuando están los dos; si no, el total escrito */
  totalDe(f: FormVenta): number | null {
    if (f.cantidadKg && f.precioKg) return Math.round(f.cantidadKg * f.precioKg);
    return f.total;
  }

  guardar(): void {
    const f = this.form();
    if (!f) return;
    const total = this.totalDe(f);
    if (!f.comprador.trim() || !f.producto.trim() || !f.fecha || !total || total <= 0) { this.errorPanel.set('ventas.errors.incomplete'); return; }
    const req: VentaRequest = {
      siembraId: f.siembraId, comprador: f.comprador.trim(), producto: f.producto.trim(), fecha: f.fecha,
      cantidadKg: f.cantidadKg || null, precioKg: f.precioKg || null, total,
      vence: f.credito && f.vence ? f.vence : null, observaciones: f.observaciones || null,
      pagadoDeContado: f.id == null && !f.credito, metodo: f.metodo,
    };
    this.guardando.set(true);
    const op = f.id == null ? this.ventas.crear(req) : this.ventas.actualizar(f.id, req);
    op.subscribe({
      next: () => { this.guardando.set(false); this.form.set(null); this.avisos.exito('ventas.saved'); this.cargar(); },
      error: (e) => { this.guardando.set(false); this.errorPanel.set(e?.error?.message || 'ventas.errors.save'); },
    });
  }

  async eliminar(v: Venta): Promise<void> {
    const ok = await this.confirm.preguntar({ mensaje: this.translate.instant('ventas.confirmDelete', { buyer: v.comprador }), peligro: true });
    if (!ok) return;
    this.ventas.eliminar(v.id).subscribe({ next: () => { this.form.set(null); this.cargar(); }, error: () => this.error.set('ventas.errors.delete') });
  }

  /** Desde el panel de edición: busca la venta y pide confirmar */
  eliminarDesdeForm(): void {
    const id = this.form()?.id;
    const v = (this.lista() ?? []).find((x) => x.id === id);
    if (v) this.eliminar(v);
  }

  // ── Pagos (abonos) ──

  cobrar(v: Venta): void {
    this.errorPanel.set(null);
    this.abono = { fecha: this.hoy, monto: v.saldo || null, metodo: 'EFECTIVO', observaciones: '' };
    this.ventas.obtener(v.id).subscribe({ next: (c) => this.cobrando.set(c), error: () => this.cobrando.set(v) });
  }

  registrarAbono(): void {
    const v = this.cobrando();
    if (!v || !this.abono.monto || this.abono.monto <= 0) return;
    this.guardando.set(true);
    this.ventas.abonar(v.id, { ...this.abono, monto: Number(this.abono.monto), observaciones: this.abono.observaciones || null }).subscribe({
      next: (act) => {
        this.guardando.set(false);
        this.cobrando.set(act);
        this.abono = { fecha: this.hoy, monto: act.saldo || null, metodo: this.abono.metodo, observaciones: '' };
        this.avisos.exito(act.saldo > 0 ? 'ventas.paymentSaved' : 'ventas.paidInFull');
        if (act.saldo <= 0) this.cobrando.set(null);
        this.cargar();
      },
      error: (e) => { this.guardando.set(false); this.errorPanel.set(e?.error?.message || 'ventas.errors.payment'); },
    });
  }

  async quitarAbono(v: Venta, a: Venta['abonos'][number]): Promise<void> {
    const ok = await this.confirm.preguntar({ mensaje: this.translate.instant('ventas.confirmDeletePayment'), peligro: true });
    if (!ok) return;
    this.ventas.quitarAbono(v.id, a).subscribe({ next: (act) => { this.cobrando.set(act); this.cargar(); } });
  }

  estadoClase(e: EstadoVenta): string {
    return e === 'PAGADA' ? 'PAGADA' : e === 'VENCIDA' ? 'ANULADA' : 'PENDIENTE';
  }

  diasVencida(v: Venta): number {
    if (!v.vence) return 0;
    const [y, m, d] = v.vence.split('-').map(Number);
    return Math.max(0, Math.round((Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000));
  }
}
