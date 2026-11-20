import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { TituloPaginaService } from '../../core/services/page-title.service';

/** Un paso del camino: un texto propio (el nombre de la finca) o una clave de traducción */
export interface Miga {
  /** Texto tal cual. `null` mientras carga (se muestra un hueco) */
  texto?: string | null;
  /** Clave de traducción, si no hay texto */
  clave?: string;
  /** A dónde lleva. El último paso es la pantalla actual y nunca es enlace */
  ruta?: (string | number)[] | null;
  /** Otros del mismo nivel (las otras fincas, los otros lotes): se abren desde la miga para saltar sin volver */
  hermanos?: { texto: string; ruta: (string | number)[]; actual?: boolean }[];
}

/**
 * Migas de pan: "Mis fincas › La Esperanza › Lote 3 › Café".
 * En el celular solo se ve el paso anterior, como un botón de volver.
 * También pone el título de la pestaña con el último paso.
 */
@Component({
  selector: 'app-migas',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MigasComponent implements OnInit {
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  readonly items = input.required<Miga[]>();
  /** Índice de la miga con su lista de hermanos abierta */
  readonly abierta = signal<number | null>(null);
  private readonly el = inject(ElementRef<HTMLElement>);

  alternar(i: number): void {
    this.abierta.set(this.abierta() === i ? null : i);
  }

  @HostListener('document:click', ['$event.target'])
  alTocarFuera(destino: EventTarget | null): void {
    if (this.abierta() !== null && destino instanceof Node && !this.el.nativeElement.contains(destino)) this.abierta.set(null);
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.abierta.set(null);
  }

  /** El paso anterior al actual que lleva a algún lado (para el botón de volver en el celular) */
  readonly padre = computed(() => {
    const lista = this.items();
    for (let i = lista.length - 2; i >= 0; i--) if (lista[i].ruta) return lista[i];
    return null;
  });

  /** "Registrar cosecha · Café · Castillo" o "Lote 3" */
  private readonly tituloPestana = computed(() => {
    this.lang.current();
    const lista = this.items();
    const ultimo = lista[lista.length - 1];
    if (!ultimo) return null;
    const texto = this.nombre(ultimo);
    if (!texto) return null;
    // Una acción ("Nuevo lote") se acompaña del nombre de lo que la contiene
    if (ultimo.texto == null && lista.length > 1) {
      const anterior = lista[lista.length - 2];
      if (anterior.texto) return `${texto} · ${anterior.texto}`;
    }
    return texto;
  });

  private readonly titulo = inject(TituloPaginaService);
  private readonly destroyRef = inject(DestroyRef);

  // En ngOnInit y no en el constructor: el título lee `items`, que aún no ha llegado al construir
  ngOnInit(): void {
    this.titulo.usarDetalle(this.tituloPestana, this.destroyRef);
  }

  /** Texto visible del paso ('' mientras carga) */
  nombre(m: Miga): string {
    if (m.texto) return m.texto;
    if (m.clave) return this.translate.instant(m.clave);
    return '';
  }
}
