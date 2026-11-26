import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, forkJoin, of, switchMap } from 'rxjs';
import { PreciosService, VentasService } from '../../../core/services/finance.service';
import { KilosEnBodega, PrecioCultivo } from '../../../core/models/finance.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CultivoDisponible, JornalService } from '../../../core/services/worker.service';
import { CultivoService } from '../../../core/services/crop.service';
import { quedanPorCosecha } from '../../../shared/harvest-stock';

/** Una cosecha de la siembra elegida con lo que queda de ella, para armar la venta */
interface OrigenKilos {
  id: number;
  fecha: string;
  calidad: string;
  kg: number;
  quedan: number;
  recolectores: string[];
}
import {
  EstadoVenta,
  MetodoCobro,
  ResumenVentas,
  Venta,
  VentaRequest,
} from '../../../core/models/finance.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { AvisosService } from '../../../core/services/toast.service';
import { FechaPipe, PesosPipe } from '../../../shared/format.pipe';
import { esPendiente } from '../../../core/offline/offline-queue.service';
import { mensajeDeError } from '../../../shared/error-message';

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
  imports: [FormsModule, TranslatePipe, PesosPipe, FechaPipe, DecimalPipe],
  templateUrl: './sales.html',
  styleUrls: [
    '../../crop/crop-ui.css',
    '../../crop/crop-blocks.css',
    '../../report/report-table.css',
    '../../worker/worker-ui.css',
    '../../worker/worker-panel.css',
    '../../../shared/styles/opciones.css',
    '../finance.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasComponent implements OnInit {
  private readonly ventas = inject(VentasService);
  private readonly jornales = inject(JornalService);
  private readonly cultivoSvc = inject(CultivoService);

  // ── De dónde salen los kilos: las cosechas de la siembra con lo que queda de cada una ──
  readonly origen = signal<OrigenKilos[]>([]);
  /** Las cosechas que entran en esta venta (todas al empezar) */
  readonly elegidas = signal<Set<number>>(new Set());
  /** Lo que queda, sumado por calidad (para "Solo primera"...) */
  readonly porCalidad = computed(() => {
    const suma = new Map<string, number>();
    for (const o of this.origen()) suma.set(o.calidad, (suma.get(o.calidad) ?? 0) + o.quedan);
    return [...suma.entries()].map(([calidad, kg]) => ({
      calidad,
      kg: Math.round(kg * 100) / 100,
    }));
  });

  private cargarOrigen(siembraId: number | null): void {
    this.origen.set([]);
    this.elegidas.set(new Set());
    const k = siembraId == null ? null : this.bodega().find((x) => x.siembraId === siembraId);
    if (!k) return;
    this.cultivoSvc.listarCosechas(k.siembraId).subscribe({
      next: (lista) => {
        if (this.form()?.siembraId !== k.siembraId) return;
        const quedan = quedanPorCosecha(
          lista.map((c) => ({ id: c.id, fecha: c.fecha, cantidadKg: c.cantidadKg })),
          k.kgVendidos,
        );
        const filas = lista
          .filter((c) => (quedan.get(c.id!) ?? 0) > 0.004)
          .sort((a, b) => b.fecha.localeCompare(a.fecha))
          .map((c) => ({
            id: c.id!,
            fecha: c.fecha,
            calidad: c.calidad,
            kg: c.cantidadKg,
            quedan: quedan.get(c.id!)!,
            recolectores: (c.recolectores ?? []).map((r) => r.nombre ?? '').filter(Boolean),
          }));
        this.origen.set(filas);
        this.elegidas.set(new Set(filas.map((f) => f.id)));
      },
      error: () => {
        /* sin el detalle: la venta se arma con el total de la siembra */
      },
    });
  }

  /** Marcar o quitar una cosecha: los kilos de la venta son la suma de lo que queda de las marcadas */
  alternarCosecha(id: number): void {
    const s = new Set(this.elegidas());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.elegidas.set(s);
    this.usarKilos(
      this.origen()
        .filter((o) => s.has(o.id))
        .reduce((t, o) => t + o.quedan, 0),
    );
  }

  /** Atajo: vender todo, o solo lo de una calidad */
  elegirCalidad(calidad: string | null): void {
    const filas = this.origen().filter((o) => calidad == null || o.calidad === calidad);
    this.elegidas.set(new Set(filas.map((o) => o.id)));
    this.usarKilos(filas.reduce((t, o) => t + o.quedan, 0));
  }

  private usarKilos(kg: number): void {
    const f = this.form();
    if (!f) return;
    const redondo = Math.round(kg * 100) / 100;
    this.auto.kg = redondo;
    this.form.set({ ...f, cantidadKg: redondo || null });
  }
  private readonly confirm = inject(ConfirmService);
  private readonly avisos = inject(AvisosService);
  private readonly translate = inject(TranslateService);

  readonly lista = signal<Venta[] | null>(null);
  readonly resumen = signal<ResumenVentas | null>(null);
  readonly compradores = signal<string[]>([]);
  readonly cultivos = signal<CultivoDisponible[]>([]);
  /** Al entrar se ven todas las ventas; las fichas de arriba filtran por cobrar o vencidas */
  readonly filtro = signal<Filtro>('todas');
  readonly comprador = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  /** Lo cosechado menos lo vendido de cada siembra */
  readonly bodega = signal<KilosEnBodega[]>([]);
  /** Las siembras que todavía tienen kilos por vender */
  readonly porVender = computed(() => this.bodega().filter((k) => k.kgDisponibles > 0.004));
  /** Todos los kilos cosechados que faltan por vender */
  readonly kgPorVender = computed(() => this.porVender().reduce((s, k) => s + k.kgDisponibles, 0));

  irAKilos(): void {
    document
      .getElementById('kilos-por-vender')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** ?siembra=34 (desde la ficha de la siembra): abre la venta de esos kilos al cargar */
  private siembraPedida: number | null = null;
  private ventaPedida = false;

  /**
   * Siembras para elegir en la venta: las activas y, además, las terminadas que todavía tienen kilos
   * (se puede vender lo cosechado aunque la temporada ya se cerró).
   */
  /**
   * De qué siembra sale la venta: solo las que tienen kilos cosechados por vender (lo que no se cosechó no se
   * vende). Al editar, también la siembra que ya tenía la venta.
   */
  readonly opcionesSiembra = computed(() => {
    const actual = this.form()?.siembraId ?? null;
    const lista = this.bodega()
      .filter((k) => k.kgDisponibles > 0.004 || k.siembraId === actual)
      .map((k) => ({
        id: k.siembraId,
        etiqueta: `${k.finca} · ${k.lote} — ${this.nombreBodega(k)}`,
      }));
    if (actual != null && !lista.some((o) => o.id === actual)) {
      const v = (this.lista() ?? []).find((x) => x.id === this.form()?.id);
      lista.push({ id: actual, etiqueta: v?.siembraNombre ?? '—' });
    }
    return lista;
  });

  /** Siembras que vendieron más de lo cosechado (ventas anotadas antes de registrar la cosecha) */
  readonly sobrevendidas = computed(() =>
    this.bodega().filter((k) => (k.kgSinCosecha ?? 0) > 0.004),
  );

  /** Lo que se llenó solo al elegir la siembra: si la persona no lo cambió, se reemplaza al elegir otra */
  private auto = { producto: '', kg: null as number | null };

  readonly form = signal<FormVenta | null>(null);
  readonly cobrando = signal<Venta | null>(null);
  readonly guardando = signal(false);
  readonly errorPanel = signal<string | null>(null);
  abono = {
    fecha: hoyIso(),
    monto: null as number | null,
    metodo: 'EFECTIVO' as MetodoCobro,
    observaciones: '',
  };
  readonly metodos: MetodoCobro[] = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'];
  readonly hoy = hoyIso();

  readonly visibles = computed(() => {
    const f = this.filtro(),
      quien = this.comprador()?.toLowerCase() ?? null;
    return (this.lista() ?? []).filter(
      (v) =>
        (f === 'todas' || (f === 'debe' ? v.estado !== 'PAGADA' : v.estado === f)) &&
        (!quien || v.comprador.toLowerCase() === quien),
    );
  });

  ngOnInit(): void {
    const pedida = Number(this.route.snapshot.queryParamMap.get('siembra'));
    this.siembraPedida = pedida > 0 ? pedida : null;
    // Desde el buscador ("Nueva venta"): ?nueva=1 abre el formulario al cargar
    this.ventaPedida = this.route.snapshot.queryParamMap.get('nueva') === '1';
    this.cargar();
    this.jornales
      .cultivosDisponibles()
      .subscribe({ next: (c) => this.cultivos.set(c), error: () => {} });
  }

  cargar(): void {
    forkJoin({
      lista: this.ventas.listar(),
      resumen: this.ventas.resumen(),
      compradores: this.ventas.compradores(),
      bodega: this.ventas.kilosEnBodega().pipe(catchError(() => of([] as KilosEnBodega[]))),
    }).subscribe({
      next: ({ lista, resumen, compradores, bodega }) => {
        this.lista.set(lista);
        this.resumen.set(resumen);
        this.compradores.set(compradores);
        this.bodega.set(bodega);
        this.error.set(null);
        this.abrirSiembraPedida();
        const abierta = this.cobrando();
        if (abierta) this.cobrando.set(lista.find((v) => v.id === abierta.id) ?? null);
      },
      error: () => {
        this.lista.set([]);
        this.error.set('ventas.errors.load');
      },
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
  private readonly suscripcionReferencia = this.pedirReferencia
    .pipe(
      debounceTime(350),
      switchMap((q) =>
        q.cultivo
          ? this.precios.deCultivo(q.cultivo, q.variedad).pipe(catchError(() => of(null)))
          : of(null),
      ),
      takeUntilDestroyed(),
    )
    .subscribe((p) => {
      this.referencia.set(p?.precioKg ? p : null);
      // En una venta nueva sin precio, se pone el de referencia (se puede cambiar)
      const f = this.form();
      if (p?.precioKg && f && f.id == null && f.precioKg == null)
        this.form.set({ ...f, precioKg: Math.round(p.precioKg) });
    });

  /**
   * De qué cultivo es la venta: el de la siembra elegida o, si no hay, el producto escrito
   * ("Mora de Castilla" → cultivo Mora, variedad "de Castilla").
   */
  private buscarReferencia(f: FormVenta): void {
    const k = f.siembraId != null ? this.bodega().find((x) => x.siembraId === f.siembraId) : null;
    if (k?.cultivo) {
      this.pedirReferencia.next({ cultivo: k.cultivo, variedad: k.variedad });
      return;
    }
    const c = f.siembraId != null ? this.cultivos().find((x) => x.id === f.siembraId) : null;
    if (c?.tipoCultivo) {
      this.pedirReferencia.next({ cultivo: c.tipoCultivo, variedad: c.variedad });
      return;
    }
    const palabras = f.producto.trim().split(' ').filter(Boolean);
    this.pedirReferencia.next({
      cultivo: palabras[0] ?? '',
      variedad: palabras.slice(1).join(' ') || null,
    });
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

  /** Vender kilos de la bodega: la venta sale con la siembra, el producto, los kilos que quedan y el precio sugerido */
  vender(k: KilosEnBodega): void {
    this.nueva();
    this.campo('siembraId', k.siembraId);
  }

  private abrirSiembraPedida(): void {
    if (this.ventaPedida) {
      this.ventaPedida = false;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { nueva: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.nuevaVenta();
      return;
    }
    const id = this.siembraPedida;
    if (id == null) return;
    this.siembraPedida = null;
    // Se quita de la dirección para que recargar no vuelva a abrir la venta
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { siembra: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const k = this.bodega().find((x) => x.siembraId === id);
    if (k && k.kgDisponibles > 0.004) {
      this.vender(k);
      return;
    }
    this.nueva();
    this.campo('siembraId', id);
  }

  /**
   * Cuántos kilos quedan de la siembra elegida para esta venta (si se está editando, cuentan también los
   * kilos que ya tenía la venta). null si no hay siembra o no tiene cosechas.
   */
  quedanDe(f: FormVenta): number | null {
    if (f.siembraId == null) return null;
    const k = this.bodega().find((x) => x.siembraId === f.siembraId);
    if (!k) return null;
    const original = f.id == null ? null : (this.lista() ?? []).find((v) => v.id === f.id);
    const propios =
      original && original.siembraId === f.siembraId ? Number(original.cantidadKg ?? 0) : 0;
    // Igual que el backend: lo cosechado menos lo vendido, más lo que ya tenía esta venta
    return Math.max(0, Math.round((k.kgCosechados - k.kgVendidos + propios) * 100) / 100);
  }

  /**
   * Los kilos escritos pasan de lo que queda de la siembra. Al editar una venta de antes que ya pasaba,
   * bajar o dejar igual los kilos sí se puede (como en el backend).
   */
  pasaDeLoQueQueda(f: FormVenta): boolean {
    const quedan = this.quedanDe(f);
    if (f.siembraId == null || !f.cantidadKg) return false;
    const original = f.id == null ? null : (this.lista() ?? []).find((v) => v.id === f.id);
    if (
      original &&
      original.siembraId === f.siembraId &&
      original.cantidadKg &&
      f.cantidadKg <= original.cantidadKg
    )
      return false;
    return quedan == null || f.cantidadKg > quedan + 0.004;
  }

  nombreBodega(k: KilosEnBodega): string {
    return [k.cultivo, k.variedad].filter(Boolean).join(' ') || k.lote;
  }

  nueva(): void {
    this.errorPanel.set(null);
    this.referencia.set(null);
    this.auto = { producto: '', kg: null };
    this.origen.set([]);
    this.form.set({
      id: null,
      comprador: this.comprador() ?? '',
      producto: '',
      siembraId: null,
      fecha: this.hoy,
      cantidadKg: null,
      precioKg: null,
      total: null,
      credito: true,
      vence: '',
      metodo: 'EFECTIVO',
      observaciones: '',
    });
  }

  /** Nueva venta desde el botón: si hay una sola siembra con kilos, ya sale elegida y llena */
  nuevaVenta(): void {
    const conKilos = this.porVender();
    if (conKilos.length === 1) this.vender(conKilos[0]);
    else this.nueva();
  }

  editar(v: Venta): void {
    this.errorPanel.set(null);
    this.form.set({
      id: v.id,
      comprador: v.comprador,
      producto: v.producto,
      siembraId: v.siembraId,
      fecha: v.fecha,
      cantidadKg: v.cantidadKg,
      precioKg: v.precioKg,
      total: v.total,
      credito: true,
      vence: v.vence ?? '',
      metodo: 'EFECTIVO',
      observaciones: v.observaciones ?? '',
    });
    this.referencia.set(null);
    this.buscarReferencia(this.form()!);
  }

  campo<K extends keyof FormVenta>(k: K, valor: FormVenta[K]): void {
    const f = this.form();
    if (!f) return;
    const nuevo = { ...f, [k]: valor };
    // Al elegir la siembra se llenan el producto y los kilos que quedan (lo que la persona escribió no se toca)
    if (k === 'siembraId') {
      const b = this.bodega().find((x) => x.siembraId === valor);
      const producto = b ? this.nombreBodega(b) : '';
      if (producto && (!f.producto || f.producto === this.auto.producto)) nuevo.producto = producto;
      this.auto.producto = producto;
      if (f.id == null) {
        const quedan = this.quedanDe(nuevo);
        if (f.cantidadKg == null || f.cantidadKg === this.auto.kg) nuevo.cantidadKg = quedan;
        this.auto.kg = quedan;
      }
    }
    this.form.set(nuevo);
    if (k === 'siembraId' && nuevo.id == null) this.cargarOrigen(nuevo.siembraId);
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
    if (!f.comprador.trim() || !f.producto.trim() || !f.fecha || !total || total <= 0) {
      this.errorPanel.set('ventas.errors.incomplete');
      return;
    }
    // De una siembra solo se vende lo que hay en su bodega de cosecha
    if (f.siembraId != null) {
      if (!f.cantidadKg || f.cantidadKg <= 0) {
        this.errorPanel.set('ventas.stock.needKg');
        return;
      }
      if (this.pasaDeLoQueQueda(f)) {
        this.errorPanel.set('ventas.stock.tooMuch');
        return;
      }
    }
    const req: VentaRequest = {
      siembraId: f.siembraId,
      comprador: f.comprador.trim(),
      producto: f.producto.trim(),
      fecha: f.fecha,
      cantidadKg: f.cantidadKg || null,
      precioKg: f.precioKg || null,
      total,
      vence: f.credito && f.vence ? f.vence : null,
      observaciones: f.observaciones || null,
      pagadoDeContado: f.id == null && !f.credito,
      metodo: f.metodo,
    };
    this.guardando.set(true);
    const op = f.id == null ? this.ventas.crear(req) : this.ventas.actualizar(f.id, req);
    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.set(null);
        this.avisos.exito('ventas.saved');
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorPanel.set(mensajeDeError(e, 'ventas.errors.save'));
      },
    });
  }

  async eliminar(v: Venta): Promise<void> {
    const ok = await this.confirm.preguntar({
      mensaje: this.translate.instant('ventas.confirmDelete', { buyer: v.comprador }),
      peligro: true,
    });
    if (!ok) return;
    this.ventas.eliminar(v.id).subscribe({
      next: () => {
        this.form.set(null);
        this.cargar();
      },
      error: () => this.error.set('ventas.errors.delete'),
    });
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
    this.ventas
      .obtener(v.id)
      .subscribe({ next: (c) => this.cobrando.set(c), error: () => this.cobrando.set(v) });
  }

  registrarAbono(): void {
    const v = this.cobrando();
    if (!v || !this.abono.monto || this.abono.monto <= 0) return;
    this.guardando.set(true);
    this.ventas
      .abonar(v.id, {
        ...this.abono,
        monto: Number(this.abono.monto),
        observaciones: this.abono.observaciones || null,
      })
      .subscribe({
        next: (act) => {
          this.guardando.set(false);
          // Sin señal el abono quedó en el teléfono: no hay saldo nuevo que mostrar todavía
          if (esPendiente(act)) {
            this.cobrando.set(null);
            this.avisos.exito('ventas.paymentSaved');
            return;
          }
          this.cobrando.set(act);
          this.abono = {
            fecha: this.hoy,
            monto: act.saldo || null,
            metodo: this.abono.metodo,
            observaciones: '',
          };
          this.avisos.exito(act.saldo > 0 ? 'ventas.paymentSaved' : 'ventas.paidInFull');
          if (act.saldo <= 0) this.cobrando.set(null);
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.errorPanel.set(mensajeDeError(e, 'ventas.errors.payment'));
        },
      });
  }

  async quitarAbono(v: Venta, a: Venta['abonos'][number]): Promise<void> {
    const ok = await this.confirm.preguntar({
      mensaje: this.translate.instant('ventas.confirmDeletePayment'),
      peligro: true,
    });
    if (!ok) return;
    this.ventas.quitarAbono(v.id, a).subscribe({
      next: (act) => {
        this.cobrando.set(act);
        this.cargar();
      },
    });
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
