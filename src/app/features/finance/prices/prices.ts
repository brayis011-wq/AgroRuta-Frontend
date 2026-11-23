import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, forkJoin, catchError } from 'rxjs';
import { PreciosService } from '../../../core/services/finance.service';
import { JornalService } from '../../../core/services/worker.service';
import { PrecioCultivo, PrecioReferencia } from '../../../core/models/finance.model';
import { AvisosService } from '../../../core/services/toast.service';
import { FechaPipe, PesosPipe } from '../../../shared/format.pipe';

/** Un cultivo del agricultor (nombre y variedad) con su precio de referencia */
interface CultivoPrecio { cultivo: string; variedad: string | null; precio: PrecioCultivo | null }

/**
 * Precios de referencia: el promedio mayorista semanal de SIPSA (DANE) para cada cultivo, o el
 * precio que la persona fije (para lo que SIPSA no publica, como el café pergamino).
 * Sirven para estimar lo que vale una cosecha sin precio anotado.
 */
@Component({
  selector: 'app-precios',
  standalone: true,
  imports: [FormsModule, TranslatePipe, PesosPipe, FechaPipe],
  templateUrl: './prices.html',
  styleUrls: ['../../crop/crop-ui.css', '../../crop/crop-blocks.css', '../../report/report-table.css', '../../worker/worker-ui.css',
    '../../worker/worker-panel.css', '../../../shared/styles/opciones.css', '../finance.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosComponent implements OnInit {
  private readonly precios = inject(PreciosService);
  private readonly jornales = inject(JornalService);
  private readonly avisos = inject(AvisosService);

  readonly cultivos = signal<CultivoPrecio[] | null>(null);
  readonly editando = signal<CultivoPrecio | null>(null);
  readonly elegido = signal<string | null>(null);
  readonly propio = signal<number | null>(null);
  readonly buscados = signal<PrecioReferencia[]>([]);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  texto = '';
  textoPanel = '';
  readonly resultados = signal<PrecioReferencia[] | null>(null);
  private readonly busqueda = new Subject<{ q: string; donde: 'pagina' | 'panel' }>();

  ngOnInit(): void {
    this.cargar();
    this.busqueda.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.q === b.q && a.donde === b.donde),
      switchMap(({ q, donde }) => (q.trim().length < 2 ? of({ lista: [] as PrecioReferencia[], donde })
        : this.precios.buscar(q).pipe(catchError(() => of([] as PrecioReferencia[])), switchMap((lista) => of({ lista, donde }))))),
    ).subscribe(({ lista, donde }) => (donde === 'pagina' ? this.resultados.set(lista) : this.buscados.set(lista)));
  }

  /** Los cultivos distintos de las siembras activas, cada uno con su precio */
  cargar(): void {
    this.jornales.cultivosDisponibles().subscribe({
      next: (cs) => {
        const unicos = new Map<string, { cultivo: string; variedad: string | null }>();
        cs.filter((c) => c.tipoCultivo).forEach((c) => unicos.set(c.tipoCultivo + '|' + (c.variedad ?? ''), { cultivo: c.tipoCultivo!, variedad: c.variedad }));
        const lista = [...unicos.values()].sort((a, b) => a.cultivo.localeCompare(b.cultivo));
        if (!lista.length) { this.cultivos.set([]); return; }
        forkJoin(lista.map((c) => this.precios.deCultivo(c.cultivo, c.variedad).pipe(catchError(() => of(null))))).subscribe((ps) =>
          this.cultivos.set(lista.map((c, i) => ({ ...c, precio: ps[i] }))));
      },
      error: () => { this.cultivos.set([]); this.error.set('precios.errors.load'); },
    });
  }

  buscar(q: string, donde: 'pagina' | 'panel'): void {
    this.busqueda.next({ q, donde });
  }

  cambiar(c: CultivoPrecio): void {
    this.editando.set(c);
    this.error.set(null);
    this.elegido.set(c.precio?.fuente === 'SIPSA' ? c.precio.producto : null);
    this.propio.set(c.precio?.fuente === 'PROPIO' ? c.precio.precioKg : null);
    this.buscados.set([]);
    this.textoPanel = '';
  }

  elegirProducto(p: string): void {
    this.elegido.set(p);
    this.propio.set(null);
  }

  guardar(): void {
    const c = this.editando();
    if (!c) return;
    const precio = this.propio();
    const producto = precio ? null : this.elegido();
    if (!producto && !precio) { this.error.set('precios.errors.choose'); return; }
    this.guardando.set(true);
    this.precios.elegir(c.cultivo, producto, precio).subscribe({
      next: () => { this.guardando.set(false); this.editando.set(null); this.avisos.exito('precios.saved'); this.cargar(); },
      error: (e) => { this.guardando.set(false); this.error.set(e?.error?.message || 'precios.errors.save'); },
    });
  }

  automatico(): void {
    const c = this.editando();
    if (!c) return;
    this.precios.quitar(c.cultivo).subscribe({ next: () => { this.editando.set(null); this.cargar(); } });
  }
}
