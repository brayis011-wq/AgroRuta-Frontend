import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * En el celular las tablas con la clase "tarjetas-m" pasan a tarjetas y el encabezado no se ve:
 * esta directiva copia el título de cada columna a sus celdas (data-l) para que cada cifra diga qué es.
 * Sigue las filas que se agregan o cambian después (paginación, filtros, filas que se abren).
 *
 *   <table class="tabla tarjetas-m" arEtiquetas>
 */
@Directive({ selector: 'table[arEtiquetas]', standalone: true })
export class EtiquetasTablaDirective implements AfterViewInit, OnDestroy {
  private readonly tabla = inject<ElementRef<HTMLTableElement>>(ElementRef);
  private observador?: MutationObserver;

  ngAfterViewInit(): void {
    this.poner();
    if (typeof MutationObserver === 'undefined') return;
    this.observador = new MutationObserver(() => this.poner());
    this.observador.observe(this.tabla.nativeElement, { childList: true, subtree: true, characterData: true });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  /** La primera columna (el nombre) no lleva etiqueta; las celdas que ya tienen una se respetan */
  private poner(): void {
    const t = this.tabla.nativeElement;
    const titulos = Array.from(t.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');
    t.querySelectorAll('tbody tr, tfoot tr').forEach((tr) => {
      let col = 0;
      for (const td of Array.from(tr.children)) {
        const titulo = titulos[col];
        if (col > 0 && titulo && td.getAttribute('data-l') !== titulo) td.setAttribute('data-l', titulo);
        col += Number(td.getAttribute('colspan') || 1);
      }
    });
  }
}
