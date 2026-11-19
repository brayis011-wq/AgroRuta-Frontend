import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

export interface Vecino {
  texto: string;
  ruta: (string | number)[];
}

/**
 * "‹ Lote Alto · 2 de 5 · Lote La Quebrada ›": pasar al anterior o al siguiente del mismo tipo sin
 * volver a la lista. Sirve para revisar uno por uno (las siembras en curso, los lotes de una finca).
 */
@Component({
  selector: 'app-anterior-siguiente',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 1) {
      <nav class="vecinos" [attr.aria-label]="etiqueta() | translate">
        @if (anterior(); as a) {
          <a [routerLink]="a.ruta" [title]="a.texto" rel="prev"><i class="ti ti-chevron-left" aria-hidden="true"></i><span>{{ a.texto }}</span></a>
        } @else { <span class="vacio"></span> }
        <small>{{ 'cultivo.active.of' | translate: { pos: posicion() + 1, total: total() } }}</small>
        @if (siguiente(); as s) {
          <a [routerLink]="s.ruta" [title]="s.texto" rel="next"><span>{{ s.texto }}</span><i class="ti ti-chevron-right" aria-hidden="true"></i></a>
        } @else { <span class="vacio"></span> }
      </nav>
    }
  `,
  styles: [`
    :host { display: block; }
    .vecinos { display: inline-flex; align-items: center; gap: .4rem; padding: 3px; border-radius: 11px;
               background: var(--ar-superficie-2); border: 1px solid var(--ar-borde); max-width: 100%; }
    a { display: inline-flex; align-items: center; gap: .25rem; max-width: 16ch; padding: .3rem .55rem; border-radius: 8px;
        color: var(--ar-tinta-2); text-decoration: none; font-size: .82rem; font-weight: 600; }
    a span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    a:hover { background: var(--ar-superficie); color: var(--ar-verde-700); }
    a:focus-visible { outline: 2px solid var(--ar-verde-600); outline-offset: 2px; }
    small { font-size: .75rem; color: var(--ar-tinta-3); white-space: nowrap; padding: 0 .2rem; }
    .vacio { width: 1.6rem; }
    @media (max-width: 560px) { a span { display: none; } }
  `],
})
export class AnteriorSiguienteComponent {
  readonly anterior = input<Vecino | null>(null);
  readonly siguiente = input<Vecino | null>(null);
  readonly posicion = input(0);
  readonly total = input(0);
  /** Para lectores de pantalla: qué se recorre ("Siembras en curso") */
  readonly etiqueta = input('cultivo.active.title');
}
