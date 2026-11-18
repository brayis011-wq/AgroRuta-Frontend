import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

export type PasoPago = 'wages' | 'payrolls' | 'payments';

interface Paso {
  clave: PasoPago;
  icono: string;
  ruta: string;
}

const PASOS: Paso[] = [
  { clave: 'wages', icono: 'ti-calendar-event', ruta: '/worker/workdays' },
  { clave: 'payrolls', icono: 'ti-file-invoice', ruta: '/worker/payrolls' },
  { clave: 'payments', icono: 'ti-cash', ruta: '/worker/payments' },
];

/**
 * Cómo se le paga a un trabajador, en tres pasos: Jornales → Nóminas → Pagos.
 * Va arriba de cada una de esas tres pantallas, con la actual resaltada.
 */
@Component({
  selector: 'app-flujo-pago',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <nav class="flujo" [attr.aria-label]="'payFlow.label' | translate">
      <ol>
        @for (p of pasos; track p.clave; let i = $index; let ultimo = $last) {
          <li [class.actual]="p.clave === actual()">
            <a [routerLink]="p.ruta" [attr.aria-current]="p.clave === actual() ? 'step' : null">
              <span class="ic" aria-hidden="true"><i class="ti {{ p.icono }}"></i></span>
              <span class="txt">
                <strong><span class="n">{{ i + 1 }}.</span> {{ 'payFlow.' + p.clave + '.title' | translate }}</strong>
                <small>{{ 'payFlow.' + p.clave + '.desc' | translate }}</small>
              </span>
            </a>
            @if (!ultimo) { <i class="ti ti-chevron-right flecha" aria-hidden="true"></i> }
          </li>
        }
      </ol>
      <!-- Celular: no caben las tres explicaciones, se muestra la del paso actual -->
      <p class="actual-movil">{{ 'payFlow.' + actual() + '.desc' | translate }}</p>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }
    li { position: relative; display: flex; align-items: stretch; min-width: 0; }
    a { flex: 1; display: flex; align-items: center; gap: .6rem; min-width: 0; padding: .6rem .75rem; border-radius: 12px;
        border: 1px solid var(--ar-borde); background: var(--ar-superficie); color: inherit; text-decoration: none;
        transition: border-color .15s, background .15s; }
    a:hover { border-color: var(--ar-borde-fuerte); }
    a:focus-visible { outline: 2px solid var(--ar-verde-600); outline-offset: 2px; }
    li.actual a { border-color: var(--ar-verde-600); background: var(--ar-verde-50); }
    .ic { width: 32px; height: 32px; flex: none; border-radius: 9px; display: grid; place-items: center; font-size: 18px;
          background: var(--ar-gris-bg); color: var(--ar-tinta-2); }
    li.actual .ic { background: var(--ar-verde-600); color: #fff; }
    .txt { display: flex; flex-direction: column; min-width: 0; }
    strong { font-size: .85rem; color: var(--ar-tinta); }
    .n { color: var(--ar-tinta-3); font-weight: 600; }
    small { font-size: .75rem; line-height: 1.3; color: var(--ar-tinta-3); }
    .flecha { position: absolute; right: -.62rem; top: 50%; transform: translateY(-50%); z-index: 1; font-size: 14px;
              color: var(--ar-tinta-3); background: var(--ar-fondo); border-radius: 50%; }
    .actual-movil { display: none; margin: .45rem .1rem 0; font-size: .78rem; color: var(--ar-tinta-3); }
    @media (max-width: 720px) {
      .actual-movil { display: block; }
      ol { gap: .35rem; }
      a { flex-direction: column; align-items: flex-start; gap: .35rem; padding: .5rem .55rem; }
      small { display: none; }
      .ic { width: 26px; height: 26px; font-size: 15px; }
      strong { font-size: .78rem; }
      .flecha { display: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlujoPagoComponent {
  /** La pantalla en la que se está */
  readonly actual = input.required<PasoPago>();
  readonly pasos = PASOS;
}
